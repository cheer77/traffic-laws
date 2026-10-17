import type { SceneDefinition } from "@traffic-laws/scene-engine";
import type { TrafficSituation } from "@traffic-laws/country-rules/traffic-situation";
import { assessSceneConsistency, type SceneConsistencyFinding } from "./scene-consistency";

/** Additive scenario-side semantics; Scene Definition v1 remains rendering-only. */
export interface SceneTrafficBinding {
  schemaVersion: 1;
  roadInstanceId: string;
  laneRoadLinks: { laneId: string; roadInstanceId: string }[];
  /** Explicit author assertion, never inferred from a static mesh. */
  inactiveSceneInstanceIds: string[];
  /** Visible signs/lights outside the modeled active approaches, or overridden by control. */
  outOfScopeControlInstanceIds: string[];
}

export interface BindingFinding {
  subject: string;
  evidence: "observed" | "authored" | "unresolved";
  status: "consistent" | "conflict" | "missing";
  detail: string;
}

function fail(message: string): never {
  throw new Error(`sceneBinding: ${message}`);
}
function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(`${path}: очікується об’єкт`);
  return value as Record<string, unknown>;
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[], path: string): void {
  for (const key of Object.keys(value))
    if (!keys.includes(key)) fail(`${path}: невідоме поле «${key}»`);
}
function instanceId(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(value))
    fail(`${path}: некоректний ID`);
  return value;
}
function visibleParticipant(assetId: string): boolean {
  return assetId.startsWith("vehicle.") || assetId.startsWith("character.");
}
function visibleControl(assetId: string): boolean {
  return assetId.startsWith("sign.") || assetId === "traffic-light.standard";
}

/** Reconstructs the binding and requires every visible road user to have an explicit activity state. */
export function validateSceneTrafficBinding(
  input: unknown,
  scene: SceneDefinition,
  situation: TrafficSituation,
): SceneTrafficBinding {
  const raw = record(input, "binding");
  exactKeys(
    raw,
    [
      "schemaVersion",
      "roadInstanceId",
      "laneRoadLinks",
      "inactiveSceneInstanceIds",
      "outOfScopeControlInstanceIds",
    ],
    "binding",
  );
  if (raw.schemaVersion !== 1) fail("підтримується лише версія 1");
  const roadInstanceId = instanceId(raw.roadInstanceId, "roadInstanceId");
  const objects = new Map(scene.objects.map((object) => [object.instanceId, object]));
  if (objects.get(roadInstanceId)?.assetId !== "intersection.city.standard")
    fail(`roadInstanceId «${roadInstanceId}» не є міським перехрестям`);
  if (!Array.isArray(raw.laneRoadLinks) || raw.laneRoadLinks.length !== situation.lanes.length)
    fail("laneRoadLinks: потрібен один зв’язок для кожної смуги");
  const laneIds = new Set(situation.lanes.map((lane) => lane.id));
  const linked = new Set<string>();
  const laneRoadLinks = raw.laneRoadLinks.map((inputLink: unknown, index) => {
    const path = `laneRoadLinks[${index}]`;
    const link = record(inputLink, path);
    exactKeys(link, ["laneId", "roadInstanceId"], path);
    const laneId = instanceId(link.laneId, `${path}.laneId`);
    if (!laneIds.has(laneId) || linked.has(laneId)) fail(`${path}: невідома або повторна смуга`);
    linked.add(laneId);
    const linkedRoad = instanceId(link.roadInstanceId, `${path}.roadInstanceId`);
    if (linkedRoad !== roadInstanceId) fail(`${path}: інше перехрестя`);
    return { laneId, roadInstanceId: linkedRoad };
  });
  if (!Array.isArray(raw.inactiveSceneInstanceIds))
    fail("inactiveSceneInstanceIds: потрібен масив");
  const inactive = raw.inactiveSceneInstanceIds.map((value: unknown, index) =>
    instanceId(value, `inactiveSceneInstanceIds[${index}]`),
  );
  if (new Set(inactive).size !== inactive.length) fail("inactiveSceneInstanceIds: повторний ID");
  const active = situation.vehicles.map((vehicle) => vehicle.sceneInstanceId);
  if (active.some((id) => id === null) || new Set(active).size !== active.length)
    fail("активні автомобілі потребують унікальних sceneInstanceId");
  for (const id of inactive) {
    if (!visibleParticipant(objects.get(id)?.assetId ?? ""))
      fail(`inactiveSceneInstanceIds: «${id}» не є видимим учасником`);
    if (active.includes(id)) fail(`«${id}» не може одночасно бути активним і неактивним`);
  }
  const declared = new Set([...active, ...inactive]);
  for (const object of scene.objects)
    if (visibleParticipant(object.assetId) && !declared.has(object.instanceId))
      fail(`для видимого учасника «${object.instanceId}» не задано активність`);
  if (!Array.isArray(raw.outOfScopeControlInstanceIds))
    fail("outOfScopeControlInstanceIds: потрібен масив");
  const outOfScope = raw.outOfScopeControlInstanceIds.map((value: unknown, index) =>
    instanceId(value, `outOfScopeControlInstanceIds[${index}]`),
  );
  if (new Set(outOfScope).size !== outOfScope.length)
    fail("outOfScopeControlInstanceIds: повторний ID");
  const applicable = [...situation.signs, ...situation.signals].map(
    (device) => device.sceneInstanceId,
  );
  if (applicable.some((id) => id === null) || new Set(applicable).size !== applicable.length)
    fail("застосовні знаки і сигнали потребують унікальних sceneInstanceId");
  for (const id of outOfScope) {
    if (!visibleControl(objects.get(id)?.assetId ?? ""))
      fail(`outOfScopeControlInstanceIds: «${id}» не є знаком чи світлофором`);
    if (applicable.includes(id)) fail(`«${id}» не може бути одночасно застосовним і поза умовою`);
  }
  const classifiedControls = new Set([...applicable, ...outOfScope]);
  for (const object of scene.objects)
    if (visibleControl(object.assetId) && !classifiedControls.has(object.instanceId))
      fail(`для видимого знака/світлофора «${object.instanceId}» не задано застосовність`);
  return {
    schemaVersion: 1,
    roadInstanceId,
    laneRoadLinks,
    inactiveSceneInstanceIds: inactive,
    outOfScopeControlInstanceIds: outOfScope,
  };
}

/** Evidence labels distinguish visible pose facts from author declarations and missing observations. */
export function assessSceneBinding(
  scene: SceneDefinition,
  situation: TrafficSituation,
  binding?: SceneTrafficBinding,
): BindingFinding[] {
  const spatial: SceneConsistencyFinding[] = assessSceneConsistency(scene, situation);
  const findings: BindingFinding[] = spatial
    .filter((item) => item.status !== "unconfirmed")
    .map((item) => ({
      subject: item.subject,
      evidence: item.subject.startsWith("vehicle:") ? "authored" : "observed",
      status: item.status === "conflict" ? "conflict" : "consistent",
      detail: item.detail,
    }));
  const add = (subject: string, present: boolean, detail: string): void => {
    findings.push({
      subject,
      evidence: present ? "authored" : "unresolved",
      status: present ? "consistent" : "missing",
      detail,
    });
  };
  add(
    "lane-road-links",
    binding !== undefined,
    "Прив’язка смуг до дорожнього об’єкта є заявою автора.",
  );
  add(
    "participant-activity",
    binding !== undefined,
    "Активність усіх видимих учасників є заявою автора.",
  );
  add(
    "signal-applicability",
    binding !== undefined,
    "Зв’язок сигналів із смугами не кодується Scene Definition.",
  );
  add(
    "sign-applicability",
    binding !== undefined,
    "Правова дія знаків для смуг не кодується Scene Definition.",
  );
  add(
    "other-control-devices",
    binding !== undefined,
    "Інші видимі знаки/світлофори явно позначені автором як поза умовою.",
  );
  for (const sign of situation.signs)
    for (const laneId of sign.laneIds) {
      const lane = situation.lanes.find((item) => item.id === laneId);
      const mismatch =
        (sign.kind === "priority" && lane?.roadPriority === "secondary") ||
        ((sign.kind === "give-way" || sign.kind === "stop") && lane?.roadPriority === "main");
      if (mismatch)
        findings.push({
          subject: `sign-road:${sign.id}`,
          evidence: "authored",
          status: "conflict",
          detail: "Пріоритет знака суперечить заявленому статусу дороги.",
        });
    }
  for (const signal of situation.signals)
    add(
      `signal-mode:${signal.id}`,
      signal.mode !== undefined && signal.mode !== "unknown",
      "Основна/додаткова секція задана автором, сцена містить лише колір.",
    );
  add(
    "control-mode",
    situation.intersection.control !== "unknown",
    "Режим регулювання задано автором.",
  );
  if (
    situation.intersection.control !== "signals" ||
    situation.signals.every(
      (signal) => signal.indication === "off" || signal.indication === "flashing-yellow",
    )
  )
    add(
      "road-relation",
      situation.intersection.roadRelation !== undefined &&
        situation.intersection.roadRelation !== "unknown",
      "Рівнозначність або пріоритет доріг задані автором.",
    );
  if (situation.intersection.roadRelation === "main-secondary")
    add(
      "road-turn",
      situation.intersection.mainRoadTurns === "no",
      "Напрям головної дороги задано автором.",
    );
  for (const fact of [
    "regulator",
    "pedestrians",
    "otherRoadUsers",
    "specialSignalSections",
    "exitBlocked",
  ] as const)
    add(
      fact,
      situation.intersection[fact] !== undefined && situation.intersection[fact] !== "unknown",
      `Умова ${fact} задана автором, не доведена статичною сценою.`,
    );
  for (const lane of situation.lanes)
    add(
      `lane:${lane.id}`,
      lane.maneuverRestriction !== undefined && lane.maneuverRestriction !== "unknown",
      "Відсутність/наявність обмеження руху зі смуги задана автором.",
    );
  for (const path of situation.trajectories) {
    add(
      `width:${path.id}`,
      path.sweptHalfWidthMeters !== undefined,
      "Габарит траєкторії задано автором.",
    );
    add(`timing:${path.id}`, path.occupancy !== undefined, "Час зайняття зони задано автором.");
  }
  if (!scene.objects.some((object) => object.instanceId === binding?.roadInstanceId))
    findings.push({
      subject: "road",
      evidence: "unresolved",
      status: "missing",
      detail: "Немає прив’язаного перехрестя.",
    });
  return findings;
}
