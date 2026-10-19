import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateScene } from "@traffic-laws/scene-engine";
import imported from "./imported.json";
import {
  exportStudioDraft,
  parseImageAnalysis,
  parseImportedTickets,
  reconstruct,
} from "./pipeline";
import { AUTHORED_TRAINING_DRAFTS, TRAINING_SCENARIOS, checkAnswer } from "../trainer/scenarios";

const tickets = parseImportedTickets(imported);
const ticket = tickets[0];
function analysis() {
  return {
    version: 1,
    ticketId: ticket.id,
    imageSha256: ticket.images[0].sha256,
    facts: [
      {
        subject: "road",
        kind: "road_geometry",
        value: "unknown",
        confidence: 1,
        bounds: [0, 0, 1, 1],
      },
      { subject: "road", kind: "lanes", value: null, confidence: 0, bounds: [0, 0, 1, 1] },
    ],
    unknowns: ["lane_count"],
    requiredAssets: [],
    camera: null,
    proposal: {
      schemaVersion: 1,
      id: ticket.id,
      name: "Synthetic test draft",
      country: "UA",
      environment: { preset: "urban" },
      objects: [],
    },
  };
}
describe("official import safety boundary", () => {
  it("matches the ten prior source transcriptions and original image bytes", () => {
    expect(tickets).toHaveLength(10);
    for (const [index, item] of tickets.entries()) {
      const reference = AUTHORED_TRAINING_DRAFTS[index];
      expect(item.question).toBe(reference.question);
      expect(item.options).toEqual(reference.answer.options);
      expect(item.answer?.index).toBe(reference.answer.correct);
      expect(item.images[0].sha256).toBe(reference.image?.sha256);
      const data = readFileSync(new URL(`../../../public${item.images[0].src}`, import.meta.url));
      expect(createHash("sha256").update(data).digest("hex")).toBe(item.images[0].sha256);
    }
  });
  it("never exposes the five unverified authored scenes in school", () => {
    expect(AUTHORED_TRAINING_DRAFTS.filter((entry) => entry.scene)).toHaveLength(5);
    expect(TRAINING_SCENARIOS.every((entry) => !entry.scene && entry.cars.length === 0)).toBe(true);
    expect(TRAINING_SCENARIOS.every((entry) => entry.importReason)).toBe(true);
  });
  it("does not score an unresolved answer, including a null selection", () => {
    const unresolved = { ...TRAINING_SCENARIOS[0], answer: { options: ["A", "B"], correct: null } };
    expect(checkAnswer(unresolved, null)).toBe(false);
    expect(checkAnswer(unresolved, 0)).toBe(false);
  });
  it("rejects tampered source bindings, duplicate records, answer indices and ready claims", () => {
    expect(() => parseImportedTickets([imported[0], imported[0]])).toThrow();
    expect(() => parseImportedTickets([{ ...imported[0], status: "ready" }])).toThrow();
    expect(() =>
      parseImportedTickets([{ ...imported[0], answer: { ...imported[0].answer, index: 99 } }]),
    ).toThrow();
    expect(() =>
      parseImportedTickets([
        { ...imported[0], answer: { ...imported[0].answer, documentSha256: "a".repeat(64) } },
      ]),
    ).toThrow();
  });
});
describe("unconnected vision and conservative reconstruction", () => {
  it("keeps every real ticket needs_review without fabricating a scene", async () => {
    for (const item of tickets) {
      const result = await reconstruct(item);
      expect(result.status).toBe("needs_review");
      expect(result.issues).toContain("vision_adapter_not_connected");
      expect(result.draft).toBeNull();
      expect(exportStudioDraft(result)).toBeNull();
    }
  });
  it("rejects wrong source hashes, code fields, out-of-range geometry and confidence", () => {
    expect(() =>
      parseImageAnalysis({ ...analysis(), imageSha256: "a".repeat(64) }, ticket),
    ).toThrow();
    expect(() => parseImageAnalysis({ ...analysis(), code: "execute()" }, ticket)).toThrow();
    expect(() =>
      parseImageAnalysis(
        { ...analysis(), facts: [{ ...analysis().facts[0], confidence: 2 }] },
        ticket,
      ),
    ).toThrow();
    expect(() =>
      parseImageAnalysis(
        {
          ...analysis(),
          camera: { position: [Infinity, 0, 0], target: [0, 0, 0], verticalFov: 45 },
        },
        ticket,
      ),
    ).toThrow();
  });
  it("exports only validated Studio drafts, never claiming independent verification", async () => {
    const result = await reconstruct(ticket, { analyze: async () => analysis() });
    expect(result.status).toBe("needs_review");
    expect(result.issues).toContain("uncertain_source_facts");
    expect(result.issues).toContain("independent_visual_review_required");
    const output = exportStudioDraft(result);
    expect(output).not.toBeNull();
    expect(validateScene(JSON.parse(output!))).toEqual(result.draft);
    expect(result.history.map((entry) => entry.stage)).toEqual([
      "analyzing",
      "assets_ready",
      "scene_built",
      "validation",
      "needs_review",
    ]);
  });
  it("does not substitute a generic road or create a nonexistent asset", async () => {
    const result = await reconstruct(ticket, {
      analyze: async () => ({ ...analysis(), requiredAssets: ["road.custom.unavailable"] }),
    });
    expect(result.missingAssets).toEqual(["road.custom.unavailable"]);
    expect(result.draft).toBeNull();
    expect(result.issues).toContain("unsupported_asset:road.custom.unavailable");
  });
  it("reports vehicle and signal mismatches without silently fixing source semantics", async () => {
    const input = analysis();
    input.facts.push({
      subject: "car-white",
      kind: "vehicle",
      value: "sedan",
      confidence: 1,
      bounds: [0, 0, 1, 1],
    });
    input.facts.push({
      subject: "light",
      kind: "signal",
      value: "green",
      confidence: 1,
      bounds: [0, 0, 1, 1],
    });
    const result = await reconstruct(ticket, { analyze: async () => input });
    expect(result.issues).toContain("vehicle_identity_or_count_mismatch");
    expect(result.issues).toContain("mismatch:light:signal");
  });
  it("rejects invalid proposals and records adapter failures", async () => {
    const result = await reconstruct(ticket, {
      analyze: async () => ({ ...analysis(), proposal: { schemaVersion: 9 } }),
    });
    expect(result.status).toBe("failed");
    expect(result.draft).toBeNull();
  });
});
