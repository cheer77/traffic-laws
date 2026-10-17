import { validateScene, type SceneDefinition } from "@traffic-laws/scene-engine";
import { validateRules, type CountryRule } from "@traffic-laws/country-rules";
import {
  validateTrafficSituation,
  type TrafficSituation,
} from "@traffic-laws/country-rules/traffic-situation";
import { analyzeTrafficSituation } from "@traffic-laws/country-rules/traffic-rules-engine";
import { assessSceneConsistency } from "./scene-consistency";

export interface Answer {
  id: string;
  text: string;
}
export type ContentStatus =
  | { state: "draft" | "in_review" }
  | { state: "verified" | "published"; reviewedAt: string; reviewedBy: string };
export interface Scenario {
  schemaVersion: 1;
  revision: number;
  id: string;
  country: "UA";
  language: "uk";
  category: string;
  question: string;
  answers: Answer[];
  correctAnswerId: string;
  explanation: string;
  ruleReferences: string[];
  sceneReference: null | { kind: "snapshot"; scene: SceneDefinition };
  /** Optional machine-checkable claim. Text-only tickets keep this absent. */
  trafficDecision?: {
    situation: TrafficSituation;
    claim:
      | { kind: "yield"; fromVehicleId: string; toVehicleId: string; affirmativeAnswerId: string }
      | { kind: "prohibited"; vehicleId: string; affirmativeAnswerId: string };
  };
  contentStatus: ContentStatus;
}
export class ScenarioValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScenarioValidationError";
  }
}
function fail(path: string, message: string): never {
  throw new ScenarioValidationError(`${path}: ${message}`);
}
function object(input: unknown, path: string): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail(path, "очікується об’єкт");
  return input as Record<string, unknown>;
}
function fields(input: Record<string, unknown>, allowed: string[], path: string): void {
  for (const key of Object.keys(input))
    if (!allowed.includes(key)) fail(path, `невідоме поле «${key}»`);
}
function string(input: unknown, path: string, max = 1000): string {
  if (typeof input !== "string" || !input.trim() || input.length > max)
    fail(path, `очікується непорожній текст до ${max} символів`);
  return input;
}
function id(input: unknown, path: string): string {
  const value = string(input, path, 80);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) fail(path, "некоректний ідентифікатор");
  return value;
}
function date(input: unknown, path: string): string {
  const value = string(input, path, 10);
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(parsed) ||
    new Date(parsed).toISOString().slice(0, 10) !== value
  )
    fail(path, "очікується дата YYYY-MM-DD");
  return value;
}
export interface ScenarioContext {
  rules: readonly CountryRule[];
}

/** Reconstruct all fields, including the scene snapshot, at the JSON trust boundary. */
export function validateScenario(input: unknown, context: ScenarioContext): Scenario {
  const value = object(input, "Сценарій");
  fields(
    value,
    [
      "schemaVersion",
      "revision",
      "id",
      "country",
      "language",
      "category",
      "question",
      "answers",
      "correctAnswerId",
      "explanation",
      "ruleReferences",
      "sceneReference",
      "trafficDecision",
      "contentStatus",
    ],
    "Сценарій",
  );
  if (value.schemaVersion !== 1)
    fail("schemaVersion", "підтримується лише версія 1; потрібна явна міграція");
  if (
    typeof value.revision !== "number" ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 1
  )
    fail("revision", "очікується додатне ціле число");
  if (value.country !== "UA") fail("country", "підтримується лише UA");
  if (value.language !== "uk") fail("language", "підтримується лише uk");
  if (!Array.isArray(value.answers) || value.answers.length < 2 || value.answers.length > 8)
    fail("answers", "потрібно від 2 до 8 відповідей");
  const answerIds = new Set<string>();
  const answers = value.answers.map((raw: unknown, index: number): Answer => {
    const path = `answers[${index}]`,
      answer = object(raw, path);
    fields(answer, ["id", "text"], path);
    const answerId = id(answer.id, `${path}.id`);
    if (answerIds.has(answerId)) fail(`${path}.id`, `повторний id «${answerId}»`);
    answerIds.add(answerId);
    return { id: answerId, text: string(answer.text, `${path}.text`) };
  });
  const correctAnswerId = id(value.correctAnswerId, "correctAnswerId");
  if (!answerIds.has(correctAnswerId)) fail("correctAnswerId", "відповідь відсутня у answers");
  if (!Array.isArray(value.ruleReferences) || value.ruleReferences.length > 20)
    fail("ruleReferences", "очікується масив до 20 посилань");
  const rules = validateRules(context.rules);
  const ruleMap = new Map(rules.map((rule) => [rule.id, rule]));
  const ruleIds = new Set<string>();
  const ruleReferences = value.ruleReferences.map((raw: unknown, index: number) => {
    const ruleId = id(raw, `ruleReferences[${index}]`);
    if (ruleIds.has(ruleId)) fail(`ruleReferences[${index}]`, `повторне посилання «${ruleId}»`);
    if (!ruleMap.has(ruleId)) fail(`ruleReferences[${index}]`, `невідоме правило «${ruleId}»`);
    ruleIds.add(ruleId);
    return ruleId;
  });
  let sceneReference: Scenario["sceneReference"] = null;
  if (value.sceneReference !== null) {
    const reference = object(value.sceneReference, "sceneReference");
    fields(reference, ["kind", "scene"], "sceneReference");
    if (reference.kind !== "snapshot") fail("sceneReference.kind", "невідомий тип посилання");
    let scene: SceneDefinition;
    try {
      scene = validateScene(reference.scene);
    } catch (error) {
      fail("sceneReference.scene", error instanceof Error ? error.message : "некоректна сцена");
    }
    if (scene.country !== value.country)
      fail("sceneReference.scene.country", "країна не збігається");
    sceneReference = { kind: "snapshot", scene };
  }
  const rawStatus = object(value.contentStatus, "contentStatus");
  let contentStatus: ContentStatus;
  if (rawStatus.state === "draft" || rawStatus.state === "in_review") {
    fields(rawStatus, ["state"], "contentStatus");
    contentStatus = { state: rawStatus.state };
  } else if (rawStatus.state === "verified" || rawStatus.state === "published") {
    fields(rawStatus, ["state", "reviewedAt", "reviewedBy"], "contentStatus");
    contentStatus = {
      state: rawStatus.state,
      reviewedAt: date(rawStatus.reviewedAt, "contentStatus.reviewedAt"),
      reviewedBy: string(rawStatus.reviewedBy, "contentStatus.reviewedBy", 120),
    };
  } else fail("contentStatus.state", "невідомий статус");
  if (contentStatus.state === "verified" || contentStatus.state === "published") {
    if (ruleReferences.length === 0)
      fail("ruleReferences", "перевірений білет потребує нормативного посилання");
    for (const ruleId of ruleReferences)
      if (ruleMap.get(ruleId)?.verification.status !== "verified")
        fail("ruleReferences", `правило «${ruleId}» не перевірене`);
  }
  let trafficDecision: Scenario["trafficDecision"];
  if (value.trafficDecision !== undefined) {
    const rawDecision = object(value.trafficDecision, "trafficDecision");
    fields(rawDecision, ["situation", "claim"], "trafficDecision");
    let situation: TrafficSituation;
    try {
      situation = validateTrafficSituation(rawDecision.situation, rules);
    } catch (error) {
      fail(
        "trafficDecision.situation",
        error instanceof Error ? error.message : "некоректна ситуація",
      );
    }
    const rawClaim = object(rawDecision.claim, "trafficDecision.claim");
    let claim: NonNullable<Scenario["trafficDecision"]>["claim"];
    if (rawClaim.kind === "yield") {
      fields(
        rawClaim,
        ["kind", "fromVehicleId", "toVehicleId", "affirmativeAnswerId"],
        "trafficDecision.claim",
      );
      claim = {
        kind: "yield",
        fromVehicleId: id(rawClaim.fromVehicleId, "trafficDecision.claim.fromVehicleId"),
        toVehicleId: id(rawClaim.toVehicleId, "trafficDecision.claim.toVehicleId"),
        affirmativeAnswerId: id(
          rawClaim.affirmativeAnswerId,
          "trafficDecision.claim.affirmativeAnswerId",
        ),
      };
      if (claim.fromVehicleId === claim.toVehicleId)
        fail("trafficDecision.claim", "учасники мають відрізнятися");
    } else if (rawClaim.kind === "prohibited") {
      fields(rawClaim, ["kind", "vehicleId", "affirmativeAnswerId"], "trafficDecision.claim");
      claim = {
        kind: "prohibited",
        vehicleId: id(rawClaim.vehicleId, "trafficDecision.claim.vehicleId"),
        affirmativeAnswerId: id(
          rawClaim.affirmativeAnswerId,
          "trafficDecision.claim.affirmativeAnswerId",
        ),
      };
    } else fail("trafficDecision.claim.kind", "невідомий тип твердження");
    if (!answerIds.has(claim.affirmativeAnswerId))
      fail("trafficDecision.claim.affirmativeAnswerId", "відповідь відсутня у answers");
    if (correctAnswerId !== claim.affirmativeAnswerId)
      fail("correctAnswerId", "суперечить формалізованому твердженню");
    if (
      (claim.kind === "yield" &&
        !situation.vehicles.some((vehicle) => vehicle.id === claim.fromVehicleId)) ||
      (claim.kind === "yield" &&
        !situation.vehicles.some((vehicle) => vehicle.id === claim.toVehicleId)) ||
      (claim.kind === "prohibited" &&
        !situation.vehicles.some((vehicle) => vehicle.id === claim.vehicleId))
    )
      fail("trafficDecision.claim", "невідомий учасник");
    const analysis = analyzeTrafficSituation(situation, rules);
    if (analysis.technicalCertainty !== "determinate")
      fail(
        "trafficDecision.situation",
        `движок не дав однозначного технічного висновку: ${analysis.explanation}`,
      );
    const supported =
      claim.kind === "yield"
        ? analysis.yieldObligations.some(
            (edge) =>
              edge.fromVehicleId === claim.fromVehicleId && edge.toVehicleId === claim.toVehicleId,
          )
        : analysis.maneuvers.some(
            (entry) => entry.vehicleId === claim.vehicleId && entry.status === "prohibited",
          );
    if (!supported) fail("trafficDecision.claim", "твердження суперечить результату движка");
    for (const reference of analysis.ruleReferences) {
      if (!ruleReferences.includes(reference))
        fail("ruleReferences", `відсутнє застосоване правило «${reference}»`);
      const section = ruleMap.get(reference)?.source?.section;
      if (section && !string(value.explanation, "explanation", 3000).includes(section))
        fail("explanation", `немає точного пункту «${section}»`);
    }
    if (!sceneReference) fail("sceneReference", "дорожнє рішення потребує знімка сцени");
    const objects = new Map(
      sceneReference.scene.objects.map((object) => [object.instanceId, object]),
    );
    for (const vehicle of situation.vehicles) {
      const object = vehicle.sceneInstanceId && objects.get(vehicle.sceneInstanceId);
      if (!object || !object.assetId.startsWith("vehicle."))
        fail(
          "trafficDecision.situation.vehicles",
          `авто «${vehicle.id}» не має відповідної моделі сцени`,
        );
    }
    for (const signal of situation.signals) {
      const object = signal.sceneInstanceId && objects.get(signal.sceneInstanceId);
      if (
        !object ||
        object.assetId !== "traffic-light.standard" ||
        object.properties.signal !== signal.indication
      )
        fail("trafficDecision.situation.signals", `сигнал «${signal.id}» не збігається зі сценою`);
    }
    for (const sign of situation.signs) {
      const object = sign.sceneInstanceId && objects.get(sign.sceneInstanceId);
      const expectedAsset =
        sign.kind === "priority"
          ? "sign.priority.main.ua"
          : sign.kind === "give-way"
            ? "sign.priority.yield.ua"
            : sign.kind === "stop"
              ? "sign.priority.stop.ua"
              : null;
      if (!object || (expectedAsset && object.assetId !== expectedAsset))
        fail("trafficDecision.situation.signs", `знак «${sign.id}» не збігається зі сценою`);
    }
    const conflict = assessSceneConsistency(sceneReference.scene, situation).find(
      (finding) => finding.status === "conflict",
    );
    if (conflict)
      fail("trafficDecision.situation.scene", `${conflict.subject}: ${conflict.detail}`);
    trafficDecision = { situation, claim };
    if (contentStatus.state === "verified" || contentStatus.state === "published")
      fail(
        "contentStatus",
        "для дорожніх рішень потрібна захищена незалежна перевірка; публікацію заблоковано",
      );
  }
  return {
    schemaVersion: 1,
    revision: value.revision,
    id: id(value.id, "id"),
    country: "UA",
    language: "uk",
    category: string(value.category, "category", 120),
    question: string(value.question, "question"),
    answers,
    correctAnswerId,
    explanation: string(value.explanation, "explanation", 3000),
    ruleReferences,
    sceneReference,
    ...(trafficDecision ? { trafficDecision } : {}),
    contentStatus,
  };
}

export function validateScenarios(
  inputs: readonly unknown[],
  context: ScenarioContext,
): Scenario[] {
  const ids = new Set<string>();
  return inputs.map((input, index) => {
    const scenario = validateScenario(input, context);
    if (ids.has(scenario.id)) fail(`scenarios[${index}].id`, `повторний id «${scenario.id}»`);
    ids.add(scenario.id);
    return scenario;
  });
}
export function parseScenarioJSON(json: string, context: ScenarioContext): Scenario {
  if (new TextEncoder().encode(json).length > 1_500_000) fail("JSON", "файл перевищує 1,5 МБ");
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch {
    fail("JSON", "некоректний синтаксис");
  }
  return validateScenario(input, context);
}
export function serializeScenario(input: Scenario, context: ScenarioContext): string {
  return JSON.stringify(validateScenario(input, context), null, 2);
}
/** Local editorial transition; this is not authentication or protected publication. */
export function publishScenario(input: Scenario, context: ScenarioContext): Scenario {
  const scenario = validateScenario(input, context);
  if (scenario.contentStatus.state !== "verified")
    fail("contentStatus", "публікація дозволена лише після перевірки");
  return validateScenario(
    { ...scenario, contentStatus: { ...scenario.contentStatus, state: "published" } },
    context,
  );
}
