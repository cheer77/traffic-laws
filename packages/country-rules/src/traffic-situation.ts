/** Semantic road facts in metres. No Three.js coordinates, rendering or legal decision is inferred. */
import { validateRules, type CountryRule } from "./index";
export type Direction = "north" | "east" | "south" | "west";
export type Maneuver = "straight" | "left" | "right" | "u-turn";
export interface ManeuverPermission {
  maneuver: Maneuver;
  status: "allowed" | "prohibited" | "unknown";
  ruleReferences: string[];
}
export interface Lane {
  id: string;
  approach: Direction;
  indexFromRight: number;
  /** Explicit road classification; never inferred from mesh placement. */
  roadPriority?: "main" | "secondary" | "equal" | "unknown";
  /** Authored observation that no lane-direction restriction applies. */
  maneuverRestriction?: "none" | "present" | "unknown";
  maneuverPermissions: ManeuverPermission[];
}
export interface RoadVehicle {
  id: string;
  laneId: string;
  intendedManeuver: Maneuver;
  vehicleType?: "non-rail" | "tram" | "other";
  sceneInstanceId: string | null;
}
export interface RoadSign {
  id: string;
  kind: "priority" | "give-way" | "stop" | "direction" | "other";
  officialCode: string | null;
  laneIds: string[];
  sceneInstanceId: string | null;
}
export interface TrafficSignal {
  id: string;
  indication: "green" | "yellow" | "red" | "flashing-yellow" | "off" | "unknown";
  mode?: "main" | "additional" | "unknown";
  laneIds: string[];
  sceneInstanceId: string | null;
}
export interface Trajectory {
  id: string;
  vehicleId: string;
  /** Authored plan-view path, x/z metres; not a simulated vehicle motion. */
  points: [number, number][];
  sweptHalfWidthMeters?: number;
  /** Optional authored occupancy interval, relative milliseconds; not derived from speed. */
  occupancy?: { enterMs: number; exitMs: number };
}
export interface TrajectoryConflict {
  firstTrajectoryId: string;
  secondTrajectoryId: string;
  kind: "crossing" | "merging" | "overlap" | "unknown";
}
export interface SimultaneousMovementCandidate {
  trajectoryIds: string[];
  assessment: "candidate" | "undetermined";
}
export interface TrafficSituation {
  schemaVersion: 1;
  id: string;
  country: "UA";
  intersection: {
    layout: "cross" | "t" | "roundabout" | "other";
    control: "signals" | "priority-signs" | "uncontrolled" | "unknown";
    roadRelation?: "equal" | "main-secondary" | "unknown";
    mainRoadTurns?: "no" | "yes" | "unknown";
    regulator?: "absent" | "present" | "unknown";
    pedestrians?: "absent" | "present" | "unknown";
    otherRoadUsers?: "absent" | "present" | "unknown";
    specialSignalSections?: "absent" | "present" | "unknown";
    exitBlocked?: "no" | "yes" | "unknown";
  };
  lanes: Lane[];
  vehicles: RoadVehicle[];
  signs: RoadSign[];
  signals: TrafficSignal[];
  trajectories: Trajectory[];
  conflicts: TrajectoryConflict[];
  simultaneousMovement: SimultaneousMovementCandidate[];
}

export class TrafficSituationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrafficSituationValidationError";
  }
}
function fail(path: string, reason: string): never {
  throw new TrafficSituationValidationError(`${path}: ${reason}`);
}
function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "очікується об’єкт");
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) fail(path, `невідоме поле «${key}»`);
}
function id(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(value))
    fail(path, "некоректний ID");
  return value;
}
function option<T extends string>(value: unknown, choices: readonly T[], path: string): T {
  if (typeof value !== "string" || !choices.includes(value as T)) fail(path, "невідоме значення");
  return value as T;
}
function list<T>(value: unknown, path: string, parse: (entry: unknown, path: string) => T): T[] {
  if (!Array.isArray(value) || value.length > 200) fail(path, "очікується масив до 200 елементів");
  return value.map((entry: unknown, index: number) => parse(entry, `${path}[${index}]`));
}
function unique<T extends { id: string }>(entries: T[], path: string): T[] {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.id)) fail(path, `повторний ID «${entry.id}»`);
    seen.add(entry.id);
  }
  return entries;
}
function references(value: unknown, path: string): string[] {
  const ids = list(value, path, id);
  if (new Set(ids).size !== ids.length) fail(path, "повторне посилання");
  return ids;
}
function requireReferences(ids: readonly string[], available: Set<string>, path: string): void {
  for (const entry of ids) if (!available.has(entry)) fail(path, `невідомий ID «${entry}»`);
}

/** Validates authored facts and references, never computes permission or priority. */
export function validateTrafficSituation(
  input: unknown,
  rules: readonly CountryRule[] = [],
): TrafficSituation {
  const ruleMap = new Map(validateRules(rules).map((rule) => [rule.id, rule]));
  const raw = record(input, "Ситуація");
  keys(
    raw,
    [
      "schemaVersion",
      "id",
      "country",
      "intersection",
      "lanes",
      "vehicles",
      "signs",
      "signals",
      "trajectories",
      "conflicts",
      "simultaneousMovement",
    ],
    "Ситуація",
  );
  if (raw.schemaVersion !== 1) fail("schemaVersion", "підтримується лише версія 1");
  if (raw.country !== "UA") fail("country", "підтримується лише UA");
  const crossing = record(raw.intersection, "intersection");
  keys(
    crossing,
    [
      "layout",
      "control",
      "roadRelation",
      "mainRoadTurns",
      "regulator",
      "pedestrians",
      "otherRoadUsers",
      "specialSignalSections",
      "exitBlocked",
    ],
    "intersection",
  );
  const intersection: TrafficSituation["intersection"] = {
    layout: option(crossing.layout, ["cross", "t", "roundabout", "other"], "intersection.layout"),
    control: option(
      crossing.control,
      ["signals", "priority-signs", "uncontrolled", "unknown"],
      "intersection.control",
    ),
    ...(crossing.roadRelation === undefined
      ? {}
      : {
          roadRelation: option<TrafficSituation["intersection"]["roadRelation"] & string>(
            crossing.roadRelation,
            ["equal", "main-secondary", "unknown"],
            "intersection.roadRelation",
          ),
        }),
    ...(crossing.mainRoadTurns === undefined
      ? {}
      : {
          mainRoadTurns: option<TrafficSituation["intersection"]["mainRoadTurns"] & string>(
            crossing.mainRoadTurns,
            ["no", "yes", "unknown"],
            "intersection.mainRoadTurns",
          ),
        }),
    ...(crossing.regulator === undefined
      ? {}
      : {
          regulator: option<TrafficSituation["intersection"]["regulator"] & string>(
            crossing.regulator,
            ["absent", "present", "unknown"],
            "intersection.regulator",
          ),
        }),
    ...(crossing.pedestrians === undefined
      ? {}
      : {
          pedestrians: option<TrafficSituation["intersection"]["pedestrians"] & string>(
            crossing.pedestrians,
            ["absent", "present", "unknown"],
            "intersection.pedestrians",
          ),
        }),
    ...(crossing.otherRoadUsers === undefined
      ? {}
      : {
          otherRoadUsers: option<TrafficSituation["intersection"]["otherRoadUsers"] & string>(
            crossing.otherRoadUsers,
            ["absent", "present", "unknown"],
            "intersection.otherRoadUsers",
          ),
        }),
    ...(crossing.specialSignalSections === undefined
      ? {}
      : {
          specialSignalSections: option<
            TrafficSituation["intersection"]["specialSignalSections"] & string
          >(
            crossing.specialSignalSections,
            ["absent", "present", "unknown"],
            "intersection.specialSignalSections",
          ),
        }),
    ...(crossing.exitBlocked === undefined
      ? {}
      : {
          exitBlocked: option<TrafficSituation["intersection"]["exitBlocked"] & string>(
            crossing.exitBlocked,
            ["no", "yes", "unknown"],
            "intersection.exitBlocked",
          ),
        }),
  };
  const lanes = unique(
    list(raw.lanes, "lanes", (entry, path): Lane => {
      const lane = record(entry, path);
      keys(
        lane,
        [
          "id",
          "approach",
          "indexFromRight",
          "roadPriority",
          "maneuverRestriction",
          "maneuverPermissions",
        ],
        path,
      );
      if (
        typeof lane.indexFromRight !== "number" ||
        !Number.isSafeInteger(lane.indexFromRight) ||
        lane.indexFromRight < 1 ||
        lane.indexFromRight > 20
      )
        fail(`${path}.indexFromRight`, "очікується ціле число 1–20");
      const maneuverPermissions = list(
        lane.maneuverPermissions,
        `${path}.maneuverPermissions`,
        (value, permissionPath): ManeuverPermission => {
          const permission = record(value, permissionPath);
          keys(permission, ["maneuver", "status", "ruleReferences"], permissionPath);
          const status = option(
            permission.status,
            ["allowed", "prohibited", "unknown"],
            `${permissionPath}.status`,
          );
          const ruleReferences = references(
            permission.ruleReferences,
            `${permissionPath}.ruleReferences`,
          );
          for (const reference of ruleReferences)
            if (!ruleMap.has(reference))
              fail(`${permissionPath}.ruleReferences`, `невідоме правило «${reference}»`);
          if (
            status !== "unknown" &&
            (ruleReferences.length === 0 ||
              ruleReferences.some(
                (reference) => ruleMap.get(reference)?.verification.status !== "verified",
              ))
          )
            fail(permissionPath, "дозвіл або заборона потребує перевірених правил");
          return {
            maneuver: option(
              permission.maneuver,
              ["straight", "left", "right", "u-turn"],
              `${permissionPath}.maneuver`,
            ),
            status,
            ruleReferences,
          };
        },
      );
      if (
        new Set(maneuverPermissions.map((permission) => permission.maneuver)).size !==
        maneuverPermissions.length
      )
        fail(`${path}.maneuverPermissions`, "повторний маневр");
      return {
        id: id(lane.id, `${path}.id`),
        approach: option(lane.approach, ["north", "east", "south", "west"], `${path}.approach`),
        indexFromRight: lane.indexFromRight,
        ...(lane.roadPriority === undefined
          ? {}
          : {
              roadPriority: option<Lane["roadPriority"] & string>(
                lane.roadPriority,
                ["main", "secondary", "equal", "unknown"],
                `${path}.roadPriority`,
              ),
            }),
        ...(lane.maneuverRestriction === undefined
          ? {}
          : {
              maneuverRestriction: option<Lane["maneuverRestriction"] & string>(
                lane.maneuverRestriction,
                ["none", "present", "unknown"],
                `${path}.maneuverRestriction`,
              ),
            }),
        maneuverPermissions,
      };
    }),
    "lanes",
  );
  const laneIds = new Set(lanes.map((lane) => lane.id));
  const vehicles = unique(
    list(raw.vehicles, "vehicles", (entry, path): RoadVehicle => {
      const vehicle = record(entry, path);
      keys(vehicle, ["id", "laneId", "intendedManeuver", "vehicleType", "sceneInstanceId"], path);
      const laneId = id(vehicle.laneId, `${path}.laneId`);
      requireReferences([laneId], laneIds, `${path}.laneId`);
      return {
        id: id(vehicle.id, `${path}.id`),
        laneId,
        intendedManeuver: option(
          vehicle.intendedManeuver,
          ["straight", "left", "right", "u-turn"],
          `${path}.intendedManeuver`,
        ),
        ...(vehicle.vehicleType === undefined
          ? {}
          : {
              vehicleType: option<RoadVehicle["vehicleType"] & string>(
                vehicle.vehicleType,
                ["non-rail", "tram", "other"],
                `${path}.vehicleType`,
              ),
            }),
        sceneInstanceId:
          vehicle.sceneInstanceId === null
            ? null
            : id(vehicle.sceneInstanceId, `${path}.sceneInstanceId`),
      };
    }),
    "vehicles",
  );
  const signs = unique(
    list(raw.signs, "signs", (entry, path): RoadSign => {
      const sign = record(entry, path);
      keys(sign, ["id", "kind", "officialCode", "laneIds", "sceneInstanceId"], path);
      const appliesTo = references(sign.laneIds, `${path}.laneIds`);
      requireReferences(appliesTo, laneIds, `${path}.laneIds`);
      return {
        id: id(sign.id, `${path}.id`),
        kind: option(
          sign.kind,
          ["priority", "give-way", "stop", "direction", "other"],
          `${path}.kind`,
        ),
        officialCode:
          sign.officialCode === null ? null : id(sign.officialCode, `${path}.officialCode`),
        laneIds: appliesTo,
        sceneInstanceId:
          sign.sceneInstanceId === null
            ? null
            : id(sign.sceneInstanceId, `${path}.sceneInstanceId`),
      };
    }),
    "signs",
  );
  const signals = unique(
    list(raw.signals, "signals", (entry, path): TrafficSignal => {
      const signal = record(entry, path);
      keys(signal, ["id", "indication", "mode", "laneIds", "sceneInstanceId"], path);
      const appliesTo = references(signal.laneIds, `${path}.laneIds`);
      requireReferences(appliesTo, laneIds, `${path}.laneIds`);
      return {
        id: id(signal.id, `${path}.id`),
        indication: option(
          signal.indication,
          ["green", "yellow", "red", "flashing-yellow", "off", "unknown"],
          `${path}.indication`,
        ),
        ...(signal.mode === undefined
          ? {}
          : {
              mode: option<TrafficSignal["mode"] & string>(
                signal.mode,
                ["main", "additional", "unknown"],
                `${path}.mode`,
              ),
            }),
        laneIds: appliesTo,
        sceneInstanceId:
          signal.sceneInstanceId === null
            ? null
            : id(signal.sceneInstanceId, `${path}.sceneInstanceId`),
      };
    }),
    "signals",
  );
  const vehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
  const trajectories = unique(
    list(raw.trajectories, "trajectories", (entry, path): Trajectory => {
      const trajectory = record(entry, path);
      keys(trajectory, ["id", "vehicleId", "points", "sweptHalfWidthMeters", "occupancy"], path);
      const vehicleId = id(trajectory.vehicleId, `${path}.vehicleId`);
      requireReferences([vehicleId], vehicleIds, `${path}.vehicleId`);
      const points = list(
        trajectory.points,
        `${path}.points`,
        (point, pointPath): [number, number] => {
          if (
            !Array.isArray(point) ||
            point.length !== 2 ||
            !point.every(
              (number) =>
                typeof number === "number" && Number.isFinite(number) && Math.abs(number) <= 100,
            )
          )
            fail(pointPath, "очікуються координати x/z у межах ±100 м");
          return [point[0], point[1]];
        },
      );
      if (points.length < 2) fail(`${path}.points`, "потрібні щонайменше дві точки");
      let sweptHalfWidthMeters: number | undefined;
      if (trajectory.sweptHalfWidthMeters !== undefined) {
        if (
          typeof trajectory.sweptHalfWidthMeters !== "number" ||
          !Number.isFinite(trajectory.sweptHalfWidthMeters) ||
          trajectory.sweptHalfWidthMeters <= 0 ||
          trajectory.sweptHalfWidthMeters > 3
        )
          fail(`${path}.sweptHalfWidthMeters`, "очікується ширина 0–3 м");
        sweptHalfWidthMeters = trajectory.sweptHalfWidthMeters;
      }
      let occupancy: Trajectory["occupancy"];
      if (trajectory.occupancy !== undefined) {
        const interval = record(trajectory.occupancy, `${path}.occupancy`);
        keys(interval, ["enterMs", "exitMs"], `${path}.occupancy`);
        if (
          typeof interval.enterMs !== "number" ||
          typeof interval.exitMs !== "number" ||
          !Number.isFinite(interval.enterMs) ||
          !Number.isFinite(interval.exitMs) ||
          interval.enterMs < 0 ||
          interval.exitMs <= interval.enterMs ||
          interval.exitMs > 3_600_000
        )
          fail(`${path}.occupancy`, "очікується коректний інтервал 0–3600000 мс");
        occupancy = { enterMs: interval.enterMs, exitMs: interval.exitMs };
      }
      return {
        id: id(trajectory.id, `${path}.id`),
        vehicleId,
        points,
        ...(sweptHalfWidthMeters === undefined ? {} : { sweptHalfWidthMeters }),
        ...(occupancy ? { occupancy } : {}),
      };
    }),
    "trajectories",
  );
  const trajectoryIds = new Set(trajectories.map((trajectory) => trajectory.id));
  if (new Set(trajectories.map((trajectory) => trajectory.vehicleId)).size !== trajectories.length)
    fail("trajectories", "для одного транспортного засобу дозволена лише одна траєкторія");
  const conflicts = list(raw.conflicts, "conflicts", (entry, path): TrajectoryConflict => {
    const conflict = record(entry, path);
    keys(conflict, ["firstTrajectoryId", "secondTrajectoryId", "kind"], path);
    const firstTrajectoryId = id(conflict.firstTrajectoryId, `${path}.firstTrajectoryId`);
    const secondTrajectoryId = id(conflict.secondTrajectoryId, `${path}.secondTrajectoryId`);
    requireReferences([firstTrajectoryId, secondTrajectoryId], trajectoryIds, path);
    if (firstTrajectoryId === secondTrajectoryId)
      fail(path, "траєкторія не може конфліктувати сама з собою");
    return {
      firstTrajectoryId,
      secondTrajectoryId,
      kind: option(conflict.kind, ["crossing", "merging", "overlap", "unknown"], `${path}.kind`),
    };
  });
  const simultaneousMovement = list(
    raw.simultaneousMovement,
    "simultaneousMovement",
    (entry, path): SimultaneousMovementCandidate => {
      const group = record(entry, path);
      keys(group, ["trajectoryIds", "assessment"], path);
      const ids = references(group.trajectoryIds, `${path}.trajectoryIds`);
      if (ids.length < 2) fail(`${path}.trajectoryIds`, "потрібні щонайменше дві траєкторії");
      requireReferences(ids, trajectoryIds, `${path}.trajectoryIds`);
      if (
        new Set(
          ids.map(
            (trajectoryId) =>
              trajectories.find((trajectory) => trajectory.id === trajectoryId)?.vehicleId,
          ),
        ).size !== ids.length
      )
        fail(`${path}.trajectoryIds`, "учасники групи мають відрізнятися");
      return {
        trajectoryIds: ids,
        assessment: option(group.assessment, ["candidate", "undetermined"], `${path}.assessment`),
      };
    },
  );
  return {
    schemaVersion: 1,
    id: id(raw.id, "id"),
    country: "UA",
    intersection,
    lanes,
    vehicles,
    signs,
    signals,
    trajectories,
    conflicts,
    simultaneousMovement,
  };
}
