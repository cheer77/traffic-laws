import { ASSET_METADATA, validateScene, type SceneDefinition } from "@traffic-laws/scene-engine";

export type PipelineStage =
  | "extracted"
  | "classified"
  | "analyzing"
  | "assets_ready"
  | "scene_built"
  | "validation"
  | "ready"
  | "needs_review"
  | "failed";
export interface StageResult {
  stage: PipelineStage;
  result: "passed" | "blocked" | "failed";
  issues: string[];
}
export interface OriginalImage {
  src: string;
  width: number;
  height: number;
  sha256: string;
  sourcePage: number;
}
export interface ImportedTicket {
  id: string;
  section: string;
  number: number;
  question: string;
  options: string[];
  images: OriginalImage[];
  answer: { index: number; page: number; method: string } | null;
  classification: { mode: "2d-only" | "candidate-3d" | "undetermined"; reason: string };
  status: "needs_review";
  issues: string[];
  history: StageResult[];
}

function object(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Expected an object");
  return input as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new Error("Unexpected field");
}
function text(input: unknown, max = 4000): string {
  if (typeof input !== "string" || !input.trim() || input.length > max)
    throw new Error("Invalid text");
  return input;
}
function integer(input: unknown, min = 1, max = 10000): number {
  if (typeof input !== "number" || !Number.isInteger(input) || input < min || input > max)
    throw new Error("Invalid integer");
  return input;
}
function list(input: unknown, max = 200): unknown[] {
  if (!Array.isArray(input) || input.length > max) throw new Error("Invalid array");
  return input;
}
function strings(input: unknown): string[] {
  return list(input).map((value) => text(value));
}
function sha(input: unknown): string {
  const value = text(input, 64);
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error("Invalid SHA-256");
  return value;
}
function choice<T extends string>(input: unknown, allowed: readonly T[]): T {
  const found = allowed.find((value) => value === input);
  if (!found) throw new Error("Invalid enum value");
  return found;
}
const STAGES: PipelineStage[] = [
  "extracted",
  "classified",
  "analyzing",
  "assets_ready",
  "scene_built",
  "validation",
  "ready",
  "needs_review",
  "failed",
];

/** Reconstruct a safe UI projection. Imported readiness/scene data cannot grant 3D access. */
export function parseImportedTickets(input: unknown): ImportedTicket[] {
  const ids = new Set<string>();
  return list(input, 10000).map((raw) => {
    const value = object(raw);
    if (value.schemaVersion !== 1) throw new Error("Unsupported import version");
    const section = text(value.section, 20);
    if (!/^\d+(?:\.\d+)?$/.test(section)) throw new Error("Invalid section");
    const number = integer(value.number);
    const id = `ua-${section.replaceAll(".", "-")}-${String(number).padStart(2, "0")}`;
    if (value.id !== id || ids.has(id)) throw new Error("Invalid or duplicate ticket ID");
    ids.add(id);
    const options = strings(value.options);
    if (options.length < 2 || options.length > 10) throw new Error("Invalid options");
    const source = object(value.source);
    sha(source.questionSha256);
    const answerHash = sha(source.answerSha256);
    const answerValue = value.answer === null ? null : object(value.answer);
    if (
      answerValue &&
      (answerValue.status !== "source_checked" || sha(answerValue.documentSha256) !== answerHash)
    )
      throw new Error("Unbound answer evidence");
    const classification = object(value.classification);
    return {
      id,
      section,
      number,
      question: text(value.question),
      options,
      images: list(value.images, 10).map((rawImage) => {
        const image = object(rawImage);
        const hash = sha(image.sha256);
        const src = text(image.src, 150);
        if (!new RegExp(`^/official-import/${hash}\\.(jpeg|jpg|png)$`).test(src))
          throw new Error("Invalid image path");
        return {
          src,
          sha256: hash,
          width: integer(image.width),
          height: integer(image.height),
          sourcePage: integer(image.sourcePage),
        };
      }),
      answer: answerValue
        ? {
            index: integer(answerValue.index, 0, options.length - 1),
            page: integer(answerValue.page),
            method: text(answerValue.method, 100),
          }
        : null,
      classification: {
        mode: choice(classification.mode, ["2d-only", "candidate-3d", "undetermined"]),
        reason: text(classification.reason),
      },
      status: choice(value.status, ["needs_review"]),
      issues: strings(value.issues),
      history: list(value.history, 20).map((rawStage) => {
        const stage = object(rawStage);
        return {
          stage: choice(stage.stage, STAGES),
          result: choice(stage.result, ["passed", "blocked", "failed"]),
          issues: strings(stage.issues),
        };
      }),
    };
  });
}

/** Source observations, not executable instructions. Null explicitly means unknown. */
export interface SourceFact {
  subject: string;
  kind:
    | "road_geometry"
    | "lanes"
    | "direction"
    | "vehicle"
    | "position"
    | "orientation"
    | "color"
    | "sign"
    | "stop_line"
    | "crosswalk"
    | "island"
    | "signal"
    | "extra_signal"
    | "maneuver";
  value: string | null;
  confidence: number;
  /** Normalized original-image bounds, top-left origin. */
  bounds: [number, number, number, number];
}
export interface ImageAnalysis {
  version: 1;
  ticketId: string;
  imageSha256: string;
  facts: SourceFact[];
  unknowns: string[];
  /** A model proposes a Scene Definition; the existing engine validates every object. */
  proposal: SceneDefinition | null;
  /** Explicit unsupported capabilities. They cannot be silently approximated. */
  requiredAssets: string[];
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    verticalFov: number;
  } | null;
}
export interface VisionAdapter {
  analyze(input: {
    ticketId: string;
    question: string;
    options: string[];
    image: OriginalImage;
  }): Promise<unknown>;
}
export class VisionAdapterError extends Error {}
export class VisionUnavailableError extends VisionAdapterError {}
export const disconnectedVision: VisionAdapter = {
  async analyze() {
    throw new VisionUnavailableError("vision_adapter_not_connected");
  },
};
function finite(input: unknown, min: number, max: number): number {
  if (typeof input !== "number" || !Number.isFinite(input) || input < min || input > max)
    throw new Error("Invalid finite number");
  return input;
}
function vector(input: unknown): [number, number, number] {
  const values = list(input, 3);
  if (values.length !== 3) throw new Error("Invalid vector");
  return [finite(values[0], -100, 100), finite(values[1], -100, 100), finite(values[2], -100, 100)];
}
export function parseImageAnalysis(input: unknown, ticket: ImportedTicket): ImageAnalysis {
  const value = object(input);
  keys(value, [
    "version",
    "ticketId",
    "imageSha256",
    "facts",
    "unknowns",
    "proposal",
    "requiredAssets",
    "camera",
  ]);
  if (
    value.version !== 1 ||
    value.ticketId !== ticket.id ||
    ticket.images.length !== 1 ||
    sha(value.imageSha256) !== ticket.images[0].sha256
  )
    throw new Error("Analysis does not match source");
  const facts = list(value.facts).map((raw): SourceFact => {
    const fact = object(raw);
    keys(fact, ["subject", "kind", "value", "confidence", "bounds"]);
    const bounds = list(fact.bounds, 4).map((n) => finite(n, 0, 1));
    if (bounds.length !== 4 || bounds[0] >= bounds[2] || bounds[1] >= bounds[3])
      throw new Error("Invalid image bounds");
    return {
      subject: text(fact.subject, 80),
      kind: choice(fact.kind, [
        "road_geometry",
        "lanes",
        "direction",
        "vehicle",
        "position",
        "orientation",
        "color",
        "sign",
        "stop_line",
        "crosswalk",
        "island",
        "signal",
        "extra_signal",
        "maneuver",
      ]),
      value: fact.value === null ? null : text(fact.value, 300),
      confidence: finite(fact.confidence, 0, 1),
      bounds: [bounds[0], bounds[1], bounds[2], bounds[3]],
    };
  });
  const factIds = facts.map((fact) => `${fact.subject}:${fact.kind}`);
  if (new Set(factIds).size !== factIds.length) throw new Error("Duplicate source fact");
  const proposal = value.proposal === null ? null : validateScene(value.proposal);
  if (proposal && proposal.id !== ticket.id) throw new Error("Scene ticket mismatch");
  const camera = value.camera === null ? null : object(value.camera);
  if (camera) keys(camera, ["position", "target", "verticalFov"]);
  return {
    version: 1,
    ticketId: ticket.id,
    imageSha256: ticket.images[0].sha256,
    facts,
    unknowns: strings(value.unknowns),
    proposal,
    requiredAssets: strings(value.requiredAssets),
    camera: camera
      ? {
          position: vector(camera.position),
          target: vector(camera.target),
          verticalFov: finite(camera.verticalFov, 10, 100),
        }
      : null,
  };
}
export interface ReconstructionResult {
  status: "needs_review" | "failed";
  history: StageResult[];
  analysis: ImageAnalysis | null;
  draft: SceneDefinition | null;
  missingAssets: string[];
  issues: string[];
}

/** Registry resolution and conservative structural checks, never visual or legal certification. */
export async function reconstruct(
  ticket: ImportedTicket,
  adapter: VisionAdapter = disconnectedVision,
): Promise<ReconstructionResult> {
  const history: StageResult[] = [{ stage: "analyzing", result: "passed", issues: [] }];
  try {
    if (ticket.images.length !== 1)
      throw new VisionUnavailableError("unique_reference_image_required");
    const raw = await adapter.analyze({
      ticketId: ticket.id,
      question: ticket.question,
      options: ticket.options,
      image: ticket.images[0],
    });
    const analysis = parseImageAnalysis(raw, ticket);
    const missingAssets = analysis.requiredAssets.filter(
      (id) => ![...ASSET_METADATA.keys()].some((known) => known === id),
    );
    const issues = analysis.unknowns.map((unknown) => `unknown:${unknown}`);
    issues.push(...missingAssets.map((id) => `unsupported_asset:${id}`));
    if (analysis.facts.some((fact) => fact.value === null || fact.confidence < 0.95))
      issues.push("uncertain_source_facts");
    for (const kind of ["road_geometry", "lanes", "direction"] as const) {
      if (!analysis.facts.some((fact) => fact.kind === kind)) issues.push(`missing_fact:${kind}`);
    }
    if (!analysis.camera) issues.push("camera_unknown");
    // V1 stores no camera, custom materials, arbitrary lanes, signs or arrow-section parameters.
    if (
      analysis.facts.some((fact) =>
        ["extra_signal", "color", "sign", "stop_line", "crosswalk", "island"].includes(fact.kind),
      )
    )
      issues.push("scene_v1_cannot_certify_required_details");
    history.push({
      stage: "assets_ready",
      result: missingAssets.length ? "blocked" : "passed",
      issues: missingAssets,
    });
    const draft = missingAssets.length ? null : analysis.proposal;
    if (draft) {
      history.push({ stage: "scene_built", result: "passed", issues: [] });
      const vehicles = draft.objects.filter((entry) => entry.assetId.startsWith("vehicle."));
      const observations = analysis.facts.filter((fact) => fact.kind === "vehicle");
      if (
        vehicles.length !== observations.length ||
        observations.some((fact) => !vehicles.some((entry) => entry.instanceId === fact.subject))
      )
        issues.push("vehicle_identity_or_count_mismatch");
      for (const kind of ["position", "orientation", "signal"] as const) {
        for (const fact of analysis.facts.filter((entry) => entry.kind === kind)) {
          const entry = draft.objects.find((entry) => entry.instanceId === fact.subject);
          const actual = !entry
            ? null
            : kind === "signal"
              ? entry.properties.signal
              : JSON.stringify(entry.transform[kind === "position" ? "position" : "rotation"]);
          if (fact.value !== actual) issues.push(`mismatch:${fact.subject}:${kind}`);
        }
      }
    } else issues.push("no_supported_scene");
    // A model cannot certify its own image interpretation. Structural equality is insufficient.
    issues.push("independent_visual_review_required", "verified_explanation_required");
    history.push(
      { stage: "validation", result: "blocked", issues },
      { stage: "needs_review", result: "blocked", issues },
    );
    return { status: "needs_review", history, analysis, draft, missingAssets, issues };
  } catch (error) {
    const status = error instanceof VisionAdapterError ? "needs_review" : "failed";
    const issues = [
      error instanceof VisionAdapterError ? error.message : "invalid_analysis_or_adapter_failure",
    ];
    history[0] = { stage: "analyzing", result: status === "failed" ? "failed" : "blocked", issues };
    history.push({ stage: status, result: "blocked", issues });
    return { status, history, analysis: null, draft: null, missingAssets: [], issues };
  }
}

/** Portable Studio draft only; metadata/review stays outside Scene Definition v1. */
export function exportStudioDraft(result: ReconstructionResult): string | null {
  return result.draft ? JSON.stringify(validateScene(result.draft), null, 2) : null;
}
