import type { SceneDefinition, SceneObject } from "@traffic-laws/scene-engine";
import type {
  Direction,
  Maneuver,
  TrafficSituation,
} from "@traffic-laws/country-rules/traffic-situation";

export interface SceneConsistencyFinding {
  subject: string;
  status: "confirmed" | "conflict" | "unconfirmed";
  detail: string;
}

const APPROACH: Record<Direction, readonly [number, number]> = {
  north: [0, -1],
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0],
};
const OPPOSITE: Record<Direction, Direction> = {
  north: "south",
  east: "west",
  south: "north",
  west: "east",
};
const EXIT: Record<Direction, Record<Maneuver, Direction>> = {
  north: { straight: "south", left: "east", right: "west", "u-turn": "north" },
  east: { straight: "west", left: "south", right: "north", "u-turn": "east" },
  south: { straight: "north", left: "west", right: "east", "u-turn": "south" },
  west: { straight: "east", left: "north", right: "south", "u-turn": "west" },
};

function onApproach(object: SceneObject, direction: Direction): boolean {
  const [x, , z] = object.transform.position;
  const axis = APPROACH[direction];
  const along = x * axis[0] + z * axis[1];
  const across = Math.abs(x * axis[1] - z * axis[0]);
  return along >= 6 && along > across;
}
function faces(object: SceneObject, direction: Direction): boolean {
  const [rx, yaw, rz] = object.transform.rotation;
  const axis = APPROACH[direction];
  return (
    Math.abs(rx) < 0.1 &&
    Math.abs(rz) < 0.1 &&
    Math.sin(yaw) * axis[0] + Math.cos(yaw) * axis[1] > 0.9
  );
}
function nearStart(object: SceneObject, point: readonly [number, number]): boolean {
  const [x, , z] = object.transform.position;
  return Math.hypot(x - point[0], z - point[1]) <= 1;
}

/** Checks pose-level facts only for the unrotated urban preset; legal and temporal facts remain authored. */
export function assessSceneConsistency(
  scene: SceneDefinition,
  situation: TrafficSituation,
): SceneConsistencyFinding[] {
  const findings: SceneConsistencyFinding[] = [];
  const add = (subject: string, status: SceneConsistencyFinding["status"], detail: string) =>
    findings.push({ subject, status, detail });
  const road = scene.objects.find((object) => object.assetId === "intersection.city.standard");
  const canonical =
    road &&
    road.transform.position.every((value) => Math.abs(value) < 0.01) &&
    road.transform.rotation.every((value) => Math.abs(value) < 0.01);
  const objects = new Map(scene.objects.map((object) => [object.instanceId, object]));
  const lanes = new Map(situation.lanes.map((lane) => [lane.id, lane]));
  if (!canonical) {
    add("coordinates", "unconfirmed", "Орієнтацію доріг цієї сцени не встановлено з пресету.");
  } else {
    for (const vehicle of situation.vehicles) {
      const object = vehicle.sceneInstanceId && objects.get(vehicle.sceneInstanceId);
      const lane = lanes.get(vehicle.laneId);
      const path = situation.trajectories.find((entry) => entry.vehicleId === vehicle.id);
      if (!object || !lane || !path) continue;
      const entry = path.points[0],
        end = path.points[path.points.length - 1];
      const inward = APPROACH[lane.approach];
      const delta: readonly [number, number] = [
        path.points[1][0] - entry[0],
        path.points[1][1] - entry[1],
      ];
      const heading = (-delta[0] * inward[0] - delta[1] * inward[1]) / Math.hypot(...delta);
      const matches =
        onApproach(object, lane.approach) &&
        faces(object, OPPOSITE[lane.approach]) &&
        nearStart(object, entry) &&
        heading > 0.8 &&
        end[0] * APPROACH[EXIT[lane.approach][vehicle.intendedManeuver]][0] +
          end[1] * APPROACH[EXIT[lane.approach][vehicle.intendedManeuver]][1] >=
          6;
      add(
        `vehicle:${vehicle.id}`,
        matches ? "confirmed" : "conflict",
        matches
          ? "Позиція, напрямок моделі (+Z), початок і вихід авторської траєкторії узгоджені."
          : "Позиція, напрямок моделі або авторська траєкторія суперечить під’їзду чи маневру.",
      );
    }
    for (const fixture of [...situation.signals, ...situation.signs]) {
      const object = fixture.sceneInstanceId && objects.get(fixture.sceneInstanceId);
      if (!object) continue;
      const matches = fixture.laneIds.every((laneId) => {
        const lane = lanes.get(laneId);
        return lane && onApproach(object, lane.approach) && faces(object, lane.approach);
      });
      add(
        `${"indication" in fixture ? "signal" : "sign"}:${fixture.id}`,
        matches ? "confirmed" : "conflict",
        matches
          ? "Об’єкт стоїть на потрібному під’їзді та звернений до потоку."
          : "Об’єкт стоїть або звернений не до заявленого під’їзду.",
      );
    }
  }
  add(
    "semantic-link",
    "unconfirmed",
    "Scene Definition не містить зв’язку сигналу/знака з конкретною смугою чи правовим режимом.",
  );
  add(
    "intent-and-lane",
    "unconfirmed",
    "Статична сцена не підтверджує намір водія, номер смуги або відсутність обмеження маневру.",
  );
  add(
    "active-users",
    "unconfirmed",
    "Scene Definition не розрізняє активних і декоративних авто/пішоходів та регулювальника.",
  );
  add(
    "control-exceptions",
    "unconfirmed",
    "Основний режим/додаткова секція, рівнозначність доріг, напрямок головної дороги й вільний виїзд не кодуються сценою.",
  );
  add(
    "time-and-width",
    "unconfirmed",
    "Ширина траєкторій і час зайняття зони задані автором, а не виміряні в 3D.",
  );
  return findings;
}
