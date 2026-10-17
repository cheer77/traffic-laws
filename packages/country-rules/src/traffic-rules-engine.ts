import { validateRules, type CountryRule } from "./index";
import {
  validateTrafficSituation,
  type Direction,
  type RoadVehicle,
  type TrafficSituation,
  type Trajectory,
} from "./traffic-situation";

export type Certainty = "determinate" | "ambiguous" | "unsupported" | "insufficient_data";
export interface ManeuverDecision {
  vehicleId: string;
  status: "allowed" | "prohibited" | "unknown";
  ruleReferences: string[];
  explanation: string;
}
export interface YieldObligation {
  fromVehicleId: string;
  toVehicleId: string;
  ruleReferences: string[];
  explanation: string;
}
export interface PathConflict {
  firstVehicleId: string;
  secondVehicleId: string;
  centerlinesIntersect: boolean;
  sweptGeometry: "intersects" | "clear" | "unknown";
  temporal: "possible-overlap" | "separated" | "unknown";
}
export interface ConcurrentAssessment {
  vehicleIds: string[];
  status: "possible" | "blocked" | "unknown";
  explanation: string;
}
export interface TrafficAnalysis {
  certainty: Certainty;
  /** Algorithmic completeness before the independent legal-review gate. */
  technicalCertainty: Certainty;
  normativeStatus: "verified" | "unverified" | "not_applicable";
  maneuvers: ManeuverDecision[];
  yieldObligations: YieldObligation[];
  /** Directed pair relations; there is deliberately no global vehicle ranking. */
  priorityRelations: {
    higherVehicleId: string;
    lowerVehicleId: string;
    ruleReferences: string[];
  }[];
  pathConflicts: PathConflict[];
  simultaneousMovement: ConcurrentAssessment[];
  ruleReferences: string[];
  diagnostics: string[];
  explanation: string;
}

type Point = readonly [number, number];
const OPPOSITE: Record<Direction, Direction> = {
  north: "south",
  south: "north",
  east: "west",
  west: "east",
};
const RIGHT: Record<Direction, Direction> = {
  north: "west",
  west: "south",
  south: "east",
  east: "north",
};
const EPSILON = 1e-8;
const OFFICIAL_URL = "https://zakon.rada.gov.ua/laws/show/1306-2001-%D0%BF";
const SUPPORTED_SECTIONS: Record<string, string> = {
  "ua-pdr-8.7.3-a": "8.7.3 а",
  "ua-pdr-8.7.3-e": "8.7.3 е",
  "ua-pdr-8.7.3-g": "8.7.3 ґ",
  "ua-pdr-8.11": "8.11",
  "ua-pdr-16.1": "16.1",
  "ua-pdr-16.6": "16.6",
  "ua-pdr-16.11": "16.11",
  "ua-pdr-16.12": "16.12, абзац перший",
};

function orientation(a: Point, b: Point, c: Point): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}
function onSegment(a: Point, b: Point, p: Point): boolean {
  return (
    Math.abs(orientation(a, b, p)) <= EPSILON &&
    p[0] >= Math.min(a[0], b[0]) - EPSILON &&
    p[0] <= Math.max(a[0], b[0]) + EPSILON &&
    p[1] >= Math.min(a[1], b[1]) - EPSILON &&
    p[1] <= Math.max(a[1], b[1]) + EPSILON
  );
}
function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const abC = orientation(a, b, c),
    abD = orientation(a, b, d);
  const cdA = orientation(c, d, a),
    cdB = orientation(c, d, b);
  if (
    ((abC > EPSILON && abD < -EPSILON) || (abC < -EPSILON && abD > EPSILON)) &&
    ((cdA > EPSILON && cdB < -EPSILON) || (cdA < -EPSILON && cdB > EPSILON))
  )
    return true;
  return onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b);
}
function pointSegmentDistanceSquared(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0],
    dz = b[1] - a[1];
  const lengthSquared = dx * dx + dz * dz;
  const fraction =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / lengthSquared));
  const x = p[0] - a[0] - fraction * dx,
    z = p[1] - a[1] - fraction * dz;
  return x * x + z * z;
}
function pathDistanceSquared(first: Trajectory, second: Trajectory): number {
  let minimum = Infinity;
  for (let i = 1; i < first.points.length; i++)
    for (let j = 1; j < second.points.length; j++) {
      const a = first.points[i - 1],
        b = first.points[i],
        c = second.points[j - 1],
        d = second.points[j];
      if (segmentsIntersect(a, b, c, d)) return 0;
      minimum = Math.min(
        minimum,
        pointSegmentDistanceSquared(a, c, d),
        pointSegmentDistanceSquared(b, c, d),
        pointSegmentDistanceSquared(c, a, b),
        pointSegmentDistanceSquared(d, a, b),
      );
    }
  return minimum;
}
function conflict(first: Trajectory, second: Trajectory): PathConflict {
  const distanceSquared = pathDistanceSquared(first, second);
  const width =
    first.sweptHalfWidthMeters !== undefined && second.sweptHalfWidthMeters !== undefined
      ? first.sweptHalfWidthMeters + second.sweptHalfWidthMeters
      : undefined;
  const sweptGeometry =
    width === undefined
      ? "unknown"
      : distanceSquared <= width * width + EPSILON
        ? "intersects"
        : "clear";
  const temporal =
    !first.occupancy || !second.occupancy
      ? "unknown"
      : first.occupancy.exitMs <= second.occupancy.enterMs ||
          second.occupancy.exitMs <= first.occupancy.enterMs
        ? "separated"
        : "possible-overlap";
  return {
    firstVehicleId: first.vehicleId,
    secondVehicleId: second.vehicleId,
    centerlinesIntersect: distanceSquared === 0,
    sweptGeometry,
    temporal,
  };
}

/** Narrow UA evaluator. Its facts are authored, never reconstructed from rendered geometry. */
export function analyzeTrafficSituation(
  input: unknown,
  sourceRules: readonly CountryRule[],
): TrafficAnalysis {
  const rules = validateRules(sourceRules);
  const situation = validateTrafficSituation(input, rules);
  const ruleMap = new Map(rules.map((rule) => [rule.id, rule]));
  const used = new Set<string>();
  const diagnostics: string[] = [];
  let unsupported = false,
    insufficient = false,
    ambiguous = false;
  const problem = (kind: "unsupported" | "insufficient" | "ambiguous", message: string): void => {
    diagnostics.push(message);
    if (kind === "unsupported") unsupported = true;
    else if (kind === "insufficient") insufficient = true;
    else ambiguous = true;
  };
  const cite = (...ids: string[]): string[] => {
    for (const id of ids) {
      const rule = ruleMap.get(id);
      if (
        !rule ||
        rule.source?.url !== OFFICIAL_URL ||
        rule.source?.section !== SUPPORTED_SECTIONS[id] ||
        rule.source?.editionDate !== "2026-04-09"
      )
        problem("unsupported", `Немає належного запису редакції для ${id}.`);
      else used.add(id);
    }
    return ids;
  };
  const intersection = situation.intersection;
  if (intersection.layout !== "cross" && intersection.layout !== "t")
    problem("unsupported", "Кругові та інші складні перехрестя не підтримуються.");
  if (intersection.regulator !== "absent")
    problem(
      intersection.regulator === "present" ? "unsupported" : "insufficient",
      "Потрібно явно встановити відсутність регулювальника.",
    );
  if (intersection.pedestrians !== "absent")
    problem(
      intersection.pedestrians === "present" ? "unsupported" : "insufficient",
      "Рух пішоходів не визначений або не підтримується.",
    );
  if (intersection.otherRoadUsers !== "absent")
    problem(
      intersection.otherRoadUsers === "present" ? "unsupported" : "insufficient",
      "Інші активні учасники руху або транспорт, що завершує проїзд, не виключені.",
    );
  if (intersection.specialSignalSections !== "absent")
    problem(
      intersection.specialSignalSections === "present" ? "unsupported" : "insufficient",
      "Додаткові секції світлофора поза вузьким набором правил.",
    );
  if (intersection.exitBlocked !== "no")
    problem(
      intersection.exitBlocked === "yes" ? "unsupported" : "insufficient",
      "Стан виїзду з перехрестя не визначений або заблокований (16.4).",
    );
  const lanes = new Map(situation.lanes.map((lane) => [lane.id, lane]));
  for (const vehicle of situation.vehicles)
    if (vehicle.vehicleType !== "non-rail")
      problem(
        vehicle.vehicleType === undefined ? "insufficient" : "unsupported",
        `Тип транспорту ${vehicle.id} не визначений або не підтримується.`,
      );

  const signals = new Map<string, TrafficSituation["signals"]>();
  for (const signal of situation.signals)
    for (const laneId of signal.laneIds) {
      const assigned = signals.get(laneId) ?? [];
      assigned.push(signal);
      signals.set(laneId, assigned);
    }
  const activeSignals = situation.signals.filter(
    (signal) => signal.indication !== "off" && signal.indication !== "flashing-yellow",
  );
  let control: "signals" | "unregulated" | "unknown" = "unknown";
  if (intersection.control === "signals") {
    if (situation.signals.length === 0) {
      problem(
        "insufficient",
        "Сигнали не описані; вимкнення не можна вивести з порожнього списку.",
      );
    } else if (activeSignals.length === 0) {
      cite("ua-pdr-16.1");
      control = "unregulated";
    } else {
      cite("ua-pdr-16.1");
      control = "signals";
    }
  } else if (intersection.control === "priority-signs" || intersection.control === "uncontrolled") {
    control = activeSignals.length > 0 ? "unknown" : "unregulated";
    if (situation.signals.length > 0) cite("ua-pdr-16.1");
    if (activeSignals.length > 0)
      problem("ambiguous", "Активний сигнал суперечить нерегульованому режиму.");
  } else problem("insufficient", "Режим регулювання перехрестя не вказано.");

  const maneuvers: ManeuverDecision[] = situation.vehicles.map((vehicle) => {
    const lane = lanes.get(vehicle.laneId);
    if (!lane) throw new Error("Validated lane reference disappeared");
    const authored = lane.maneuverPermissions.find(
      (entry) => entry.maneuver === vehicle.intendedManeuver,
    );
    if (authored?.status === "prohibited")
      return {
        vehicleId: vehicle.id,
        status: "prohibited",
        ruleReferences: cite(...authored.ruleReferences),
        explanation: "Маневр заборонено перевіреним обмеженням смуги.",
      };
    const assigned = control === "signals" ? (signals.get(lane.id) ?? []) : [];
    if (assigned.length === 1 && assigned[0].mode === "main" && assigned[0].indication === "red")
      return {
        vehicleId: vehicle.id,
        status: "prohibited",
        ruleReferences: cite("ua-pdr-8.7.3-e"),
        explanation: "Основний червоний сигнал забороняє рух.",
      };
    if (lane.maneuverRestriction !== "none" && authored?.status !== "allowed") {
      problem("insufficient", `Для ${vehicle.id} невідомі обмеження напрямку руху зі смуги.`);
      return {
        vehicleId: vehicle.id,
        status: "unknown",
        ruleReferences: [],
        explanation: "Дозвіл із цієї смуги не встановлено.",
      };
    }
    if (authored?.status === "allowed") cite(...authored.ruleReferences);
    if (control === "signals") {
      if (assigned.length !== 1) {
        problem("insufficient", `Для смуги ${lane.id} потрібен один однозначний сигнал.`);
        return {
          vehicleId: vehicle.id,
          status: "unknown",
          ruleReferences: [],
          explanation: "Сигнал не визначено однозначно.",
        };
      }
      const signal = assigned[0];
      if (signal.mode !== "main") {
        problem(
          signal.mode === "additional" ? "unsupported" : "insufficient",
          `Тип сигналу для ${lane.id} не підтримується або не заданий.`,
        );
        return {
          vehicleId: vehicle.id,
          status: "unknown",
          ruleReferences: [],
          explanation: "Основний сигнал не підтверджений.",
        };
      }
      if (signal.indication === "green")
        return {
          vehicleId: vehicle.id,
          status: "allowed",
          ruleReferences: cite("ua-pdr-8.7.3-a"),
          explanation:
            "Основний зелений сигнал допускає рух; обов’язки уступити оцінюються окремо.",
        };
      if (signal.indication === "yellow") {
        cite("ua-pdr-8.7.3-g", "ua-pdr-8.11");
        problem(
          "unsupported",
          `Жовтий сигнал для ${vehicle.id}: виняток 8.11 потребує даних про зупинку та безпеку.`,
        );
      } else problem("insufficient", `Сигнал для ${vehicle.id} не визначено.`);
      return {
        vehicleId: vehicle.id,
        status: "unknown",
        ruleReferences: [],
        explanation: "За цим сигналом рух не визначено.",
      };
    }
    if (control === "unregulated")
      return {
        vehicleId: vehicle.id,
        status: "allowed",
        ruleReferences: [],
        explanation: "Маневр не обмежений смугою; перевага оцінюється окремо.",
      };
    return {
      vehicleId: vehicle.id,
      status: "unknown",
      ruleReferences: [],
      explanation: "Режим перехрестя не визначено.",
    };
  });
  const admission = new Map(maneuvers.map((entry) => [entry.vehicleId, entry.status]));

  const yieldObligations: YieldObligation[] = [];
  const addYield = (
    from: RoadVehicle,
    to: RoadVehicle,
    ruleId: string,
    explanation: string,
  ): void => {
    if (admission.get(from.id) !== "allowed" || admission.get(to.id) !== "allowed") return;
    yieldObligations.push({
      fromVehicleId: from.id,
      toVehicleId: to.id,
      ruleReferences: cite(ruleId),
      explanation,
    });
  };
  if (control === "unregulated") {
    if (intersection.roadRelation === "main-secondary") {
      if (intersection.mainRoadTurns !== "no")
        problem(
          intersection.mainRoadTurns === "yes" ? "unsupported" : "insufficient",
          "Поворот головної дороги потребує 16.14 або явного виключення.",
        );
      for (const vehicle of situation.vehicles) {
        const lane = lanes.get(vehicle.laneId);
        if (lane?.roadPriority !== "main" && lane?.roadPriority !== "secondary")
          problem("insufficient", `Статус дороги для ${vehicle.id} невідомий.`);
        const signs = situation.signs.filter((sign) => sign.laneIds.includes(vehicle.laneId));
        if (
          signs.some((sign) => sign.kind === "priority") &&
          signs.some((sign) => sign.kind === "give-way" || sign.kind === "stop")
        )
          problem("ambiguous", `Суперечливі знаки пріоритету для ${vehicle.laneId}.`);
        if (
          (lane?.roadPriority === "main" && !signs.some((sign) => sign.kind === "priority")) ||
          (lane?.roadPriority === "secondary" &&
            !signs.some((sign) => sign.kind === "give-way" || sign.kind === "stop"))
        )
          problem("insufficient", `Знак пріоритету для смуги ${vehicle.laneId} не підтверджено.`);
      }
    } else if (intersection.roadRelation === "equal") {
      for (const vehicle of situation.vehicles)
        if (lanes.get(vehicle.laneId)?.roadPriority !== "equal")
          problem("insufficient", `Рівнозначність дороги для ${vehicle.id} не підтверджена.`);
      if (
        situation.signs.some(
          (sign) => sign.kind === "priority" || sign.kind === "give-way" || sign.kind === "stop",
        )
      )
        problem("ambiguous", "Знаки пріоритету суперечать рівнозначним дорогам.");
    } else problem("insufficient", "Рівнозначність доріг не задана.");
  }
  for (const from of situation.vehicles)
    for (const to of situation.vehicles) {
      if (from.id === to.id) continue;
      const first = lanes.get(from.laneId),
        second = lanes.get(to.laneId);
      if (!first || !second) continue;
      if (
        control === "unregulated" &&
        first.roadPriority === second.roadPriority &&
        OPPOSITE[first.approach] === second.approach &&
        (from.intendedManeuver === "left" || from.intendedManeuver === "u-turn") &&
        (to.intendedManeuver === "straight" || to.intendedManeuver === "right")
      )
        problem(
          "unsupported",
          `Зустрічний поворот ${from.id}/${to.id} на нерегульованому перехресті потребує окремого правила (16.13).`,
        );
      if (
        control === "signals" &&
        (from.intendedManeuver === "left" || from.intendedManeuver === "u-turn") &&
        OPPOSITE[first.approach] === second.approach &&
        (to.intendedManeuver === "straight" || to.intendedManeuver === "right")
      ) {
        const fromSignal = (signals.get(first.id) ?? [])[0];
        if (fromSignal?.indication === "green" && fromSignal.mode === "main")
          addYield(
            from,
            to,
            "ua-pdr-16.6",
            "Поворот ліворуч на основний зелений: уступити зустрічному транспорту прямо або праворуч.",
          );
      }
      if (
        control === "unregulated" &&
        intersection.roadRelation === "main-secondary" &&
        intersection.mainRoadTurns === "no" &&
        first.roadPriority === "secondary" &&
        second.roadPriority === "main"
      )
        addYield(
          from,
          to,
          "ua-pdr-16.11",
          "Із другорядної дороги слід дати дорогу транспорту на головній.",
        );
      if (
        control === "unregulated" &&
        intersection.roadRelation === "equal" &&
        first.roadPriority === "equal" &&
        second.roadPriority === "equal" &&
        RIGHT[first.approach] === second.approach
      )
        addYield(
          from,
          to,
          "ua-pdr-16.12",
          "На рівнозначних дорогах нерейковий транспорт поступається транспорту праворуч.",
        );
    }
  if (
    yieldObligations.some((edge) =>
      yieldObligations.some(
        (reverse) =>
          reverse.fromVehicleId === edge.toVehicleId && reverse.toVehicleId === edge.fromVehicleId,
      ),
    )
  )
    problem("ambiguous", "Виявлено взаємно суперечливі обов’язки уступити.");

  const paths = new Map(
    situation.trajectories.map((trajectory) => [trajectory.vehicleId, trajectory]),
  );
  for (const vehicle of situation.vehicles)
    if (!paths.has(vehicle.id)) problem("insufficient", `Немає траєкторії для ${vehicle.id}.`);
  const pathConflicts: PathConflict[] = [];
  for (let i = 0; i < situation.vehicles.length; i++)
    for (let j = i + 1; j < situation.vehicles.length; j++) {
      const first = paths.get(situation.vehicles[i].id),
        second = paths.get(situation.vehicles[j].id);
      if (!first || !second) continue;
      const item = conflict(first, second);
      pathConflicts.push(item);
      if (item.sweptGeometry === "unknown")
        problem("insufficient", `Невідома ширина траєкторій ${first.id} і ${second.id}.`);
      if (item.temporal === "unknown")
        problem("insufficient", `Невідомий час зайняття зони для ${first.id} і ${second.id}.`);
      if (
        item.sweptGeometry === "intersects" &&
        item.temporal === "possible-overlap" &&
        admission.get(first.vehicleId) === "allowed" &&
        admission.get(second.vehicleId) === "allowed" &&
        !yieldObligations.some(
          (edge) =>
            (edge.fromVehicleId === first.vehicleId && edge.toVehicleId === second.vehicleId) ||
            (edge.fromVehicleId === second.vehicleId && edge.toVehicleId === first.vehicleId),
        )
      )
        problem(
          "unsupported",
          `Для конфлікту ${first.vehicleId}/${second.vehicleId} немає підтримуваного правила черговості.`,
        );
    }
  for (const authored of situation.conflicts) {
    const first = situation.trajectories.find((entry) => entry.id === authored.firstTrajectoryId);
    const second = situation.trajectories.find((entry) => entry.id === authored.secondTrajectoryId);
    if (!first || !second) continue;
    const computed = pathConflicts.find(
      (entry) =>
        (entry.firstVehicleId === first.vehicleId && entry.secondVehicleId === second.vehicleId) ||
        (entry.firstVehicleId === second.vehicleId && entry.secondVehicleId === first.vehicleId),
    );
    if (authored.kind !== "unknown" && computed?.sweptGeometry === "clear")
      problem(
        "ambiguous",
        `Авторський конфлікт ${authored.firstTrajectoryId}/${authored.secondTrajectoryId} суперечить геометрії.`,
      );
  }
  const simultaneousMovement = situation.simultaneousMovement.map((group): ConcurrentAssessment => {
    const vehicleIds = group.trajectoryIds
      .map((id) => situation.trajectories.find((path) => path.id === id)?.vehicleId)
      .filter((id): id is string => id !== undefined);
    if (vehicleIds.some((id) => admission.get(id) === "prohibited"))
      return { vehicleIds, status: "blocked", explanation: "Щонайменше один маневр заборонено." };
    if (
      group.assessment !== "candidate" ||
      vehicleIds.some((id) => admission.get(id) !== "allowed")
    )
      return {
        vehicleIds,
        status: "unknown",
        explanation: "Дозвіл на всі маневри не встановлено.",
      };
    const relevant = pathConflicts.filter(
      (pair) =>
        vehicleIds.includes(pair.firstVehicleId) && vehicleIds.includes(pair.secondVehicleId),
    );
    if (
      relevant.some(
        (pair) => pair.sweptGeometry === "intersects" && pair.temporal === "possible-overlap",
      )
    )
      return {
        vehicleIds,
        status: "blocked",
        explanation: "Авторські часові інтервали можуть одночасно зайняти спільну зону.",
      };
    if (relevant.some((pair) => pair.temporal === "separated"))
      return {
        vehicleIds,
        status: "blocked",
        explanation: "Інтервали руху не перетинаються в часі.",
      };
    if (relevant.some((pair) => pair.sweptGeometry === "unknown" || pair.temporal === "unknown"))
      return {
        vehicleIds,
        status: "unknown",
        explanation: "Не вистачає ширини або часових інтервалів.",
      };
    return {
      vehicleIds,
      status: "possible",
      explanation:
        "У цій моделі шляхи мають достатній проміжок; обов’язок не створювати перешкоди зберігається. Це не гарантія безпеки реального руху.",
    };
  });
  const ruleReferences = [...used].sort();
  const normativeStatus =
    ruleReferences.length === 0
      ? "not_applicable"
      : ruleReferences.every((id) => ruleMap.get(id)?.verification.status === "verified")
        ? "verified"
        : "unverified";
  const technicalCertainty: Certainty = ambiguous
    ? "ambiguous"
    : unsupported
      ? "unsupported"
      : insufficient
        ? "insufficient_data"
        : "determinate";
  if (normativeStatus === "unverified")
    problem(
      "unsupported",
      "Застосовані нормативні записи не пройшли незалежну змістову перевірку.",
    );
  const certainty: Certainty = ambiguous
    ? "ambiguous"
    : unsupported
      ? "unsupported"
      : insufficient
        ? "insufficient_data"
        : "determinate";
  if (certainty !== "determinate")
    for (const group of simultaneousMovement)
      if (group.status === "possible") {
        group.status = "unknown";
        group.explanation =
          "Загальна визначеність рішення недостатня для висновку про одночасний рух.";
      }
  return {
    certainty,
    technicalCertainty,
    normativeStatus,
    maneuvers,
    yieldObligations,
    priorityRelations: yieldObligations.map((edge) => ({
      higherVehicleId: edge.toVehicleId,
      lowerVehicleId: edge.fromVehicleId,
      ruleReferences: edge.ruleReferences,
    })),
    pathConflicts,
    simultaneousMovement,
    ruleReferences,
    diagnostics,
    explanation:
      diagnostics.length > 0
        ? diagnostics.join(" ")
        : "Рішення отримано для явно заданого вузького набору дорожніх умов.",
  };
}
