import type { Direction, TrafficSituation } from "@traffic-laws/country-rules/traffic-situation";
import { analyzeTrafficSituation } from "@traffic-laws/country-rules/traffic-rules-engine";
import { UA_PDR_REFERENCES } from "@traffic-laws/country-rules/ua-pdr-references";
import type { MotionPlan } from "./motion";
import { DRIVE_SECONDS, routeLength, routePose } from "./motion";

export interface TrainingCar extends MotionPlan {
  id: string;
  label: string;
  kind: "sedan" | "suv";
  color: string;
}
export interface TrainingScenario {
  id: string;
  title: string;
  summary: string;
  question: string;
  control: "uncontrolled" | "priority-signs" | "signals";
  cars: TrainingCar[];
  answer: { kind: "order"; ids: string[] } | { kind: "choice"; options: string[]; correct: number };
  explanation: string;
  references: string[];
  signalChange?: number;
}
const car = (
  id: string,
  approach: Direction,
  release: number,
  maneuver: MotionPlan["maneuver"] = "straight",
): TrainingCar => ({
  id,
  approach,
  release,
  maneuver,
  label: id === "a" ? "А · синій седан" : id === "b" ? "Б · зелений SUV" : "В · синій седан",
  kind: id === "b" ? "suv" : "sedan",
  color: id === "a" ? "#287bc1" : id === "b" ? "#68866a" : "#8754c7",
});
export const TRAINING_SCENARIOS: TrainingScenario[] = [
  {
    id: "right-hand",
    title: "Перешкода праворуч",
    summary: "Рівнозначні дороги · 2 авто",
    control: "uncontrolled",
    cars: [car("a", "south", 17), car("b", "east", 4)],
    question: "Обидва авто їдуть прямо рівнозначними дорогами. У якому порядку вони проїдуть?",
    answer: { kind: "order", ids: ["b", "a"] },
    explanation:
      "У цій моделі автомобіль Б наближається праворуч від А. Водій А дає йому дорогу. Б проїжджає, після нього — А. Світлофори вимкнені, знаків пріоритету немає.",
    references: ["ua-pdr-16.12"],
  },
  {
    id: "main-road",
    title: "Головна та другорядна",
    summary: "Знаки пріоритету · 2 авто",
    control: "priority-signs",
    cars: [car("a", "south", 17), car("b", "east", 4)],
    question:
      "А під’їжджає до знака «Дати дорогу», Б рухається головною дорогою. Оберіть порядок проїзду.",
    answer: { kind: "order", ids: ["b", "a"] },
    explanation:
      "Автомобіль А на другорядній дорозі дає дорогу Б на головній. Головна дорога проходить зі сходу на захід і не змінює напрямку. Після Б проїжджає А.",
    references: ["ua-pdr-16.11"],
  },
  {
    id: "left-turn",
    title: "Ліворуч назустріч потоку",
    summary: "Основний зелений · 2 авто",
    control: "signals",
    cars: [car("a", "south", 17, "left"), car("b", "north", 4)],
    question:
      "Для обох авто горить основний зелений. А повертає ліворуч, Б їде назустріч прямо. Хто проїде першим?",
    answer: { kind: "order", ids: ["b", "a"] },
    explanation:
      "Повертаючи ліворуч на основний зелений, А дає дорогу зустрічному Б, який їде прямо. Після звільнення перехрестя А завершує поворот у свою смугу.",
    references: ["ua-pdr-16.1", "ua-pdr-16.6"],
  },
  {
    id: "green-light",
    title: "Рух за світлофором",
    summary: "Зміна сигналів · 2 авто",
    control: "signals",
    cars: [car("a", "south", 4), car("b", "east", 21)],
    signalChange: 18,
    question: "Для А горить зелений, для Б — червоний. Хто може почати проїзд зараз?",
    answer: {
      kind: "choice",
      options: ["Лише автомобіль А", "Лише автомобіль Б", "Обидва автомобілі"],
      correct: 0,
    },
    explanation:
      "На початку А рухається на зелений, Б чекає перед стоп-лінією на червоний. У демонстрації після завершення проїзду А показано жовтий та проміжок із червоним для всіх; потім Б отримує зелений.",
    references: ["ua-pdr-8.7.3-a", "ua-pdr-8.7.3-e", "ua-pdr-16.1"],
  },
  {
    id: "together",
    title: "Рух одночасно",
    summary: "Незалежні смуги · 3 авто",
    control: "signals",
    cars: [car("a", "south", 4), car("b", "north", 4), car("c", "east", 21)],
    signalChange: 18,
    question:
      "А та Б мають зелений і їдуть прямо назустріч у різних смугах. В чекає на червоний. Як можуть рухатися А та Б?",
    answer: {
      kind: "choice",
      options: ["А, потім Б", "Б, потім А", "Одночасно, кожен своєю смугою"],
      correct: 2,
    },
    explanation:
      "Траєкторії А та Б проходять у різних смугах і не перетинаються. У заданих умовах вони можуть рухатися одночасно. Автомобіль В чекає на червоний і починає рух лише після зміни фази.",
    references: ["ua-pdr-8.7.3-a", "ua-pdr-16.1"],
  },
];
export function signalAt(
  scenario: TrainingScenario,
  approach: Direction,
  time: number,
): "off" | "red" | "yellow" | "green" {
  if (scenario.control !== "signals") return "off";
  const vertical = approach === "south" || approach === "north";
  if (scenario.signalChange !== undefined) {
    if (time >= scenario.signalChange + 2) return vertical ? "red" : "green";
    if (time >= scenario.signalChange) return "red";
    if (time >= scenario.signalChange - 2) return vertical ? "yellow" : "red";
  }
  return vertical ? "green" : "red";
}
export function durationOf(scenario: TrainingScenario): number {
  return Math.max(...scenario.cars.map((entry) => entry.release + DRIVE_SECONDS));
}
export function checkAnswer(
  scenario: TrainingScenario,
  order: string[],
  choice: number | null,
): boolean {
  return scenario.answer.kind === "order"
    ? order.length === scenario.answer.ids.length &&
        order.every(
          (id, index) =>
            id === (scenario.answer.kind === "order" ? scenario.answer.ids[index] : undefined),
        )
    : choice === scenario.answer.correct;
}
/** Reuse the existing bounded evaluator. These facts do not promote unverified legal sources. */
export function situationOf(scenario: TrainingScenario): TrafficSituation {
  return {
    schemaVersion: 1,
    id: scenario.id,
    country: "UA",
    intersection: {
      layout: "cross",
      control: scenario.control,
      roadRelation: scenario.control === "priority-signs" ? "main-secondary" : "equal",
      mainRoadTurns: "no",
      regulator: "absent",
      pedestrians: "absent",
      otherRoadUsers: "absent",
      specialSignalSections: "absent",
      exitBlocked: "no",
    },
    lanes: scenario.cars.map((entry) => ({
      id: entry.approach,
      approach: entry.approach,
      indexFromRight: 1,
      roadPriority:
        scenario.control === "priority-signs"
          ? entry.approach === "east"
            ? "main"
            : "secondary"
          : "equal",
      maneuverRestriction: "none",
      maneuverPermissions: [],
    })),
    vehicles: scenario.cars.map((entry) => ({
      id: entry.id,
      laneId: entry.approach,
      intendedManeuver: entry.maneuver,
      vehicleType: "non-rail",
      sceneInstanceId: entry.id,
    })),
    signs:
      scenario.control === "priority-signs"
        ? scenario.cars.map((entry) => ({
            id: `sign-${entry.id}`,
            kind: entry.approach === "east" ? "priority" : "give-way",
            officialCode: entry.approach === "east" ? "2.3" : "2.1",
            laneIds: [entry.approach],
            sceneInstanceId: null,
          }))
        : [],
    signals:
      scenario.control === "signals"
        ? scenario.cars.map((entry) => ({
            id: `light-${entry.id}`,
            indication: signalAt(scenario, entry.approach, 0),
            mode: "main",
            laneIds: [entry.approach],
            sceneInstanceId: null,
          }))
        : [],
    trajectories: scenario.cars.map((entry) => ({
      id: `path-${entry.id}`,
      vehicleId: entry.id,
      points: Array.from({ length: 65 }, (_, index) => {
        const pose = routePose(entry, (routeLength(entry.maneuver) * index) / 64, {
          x: 0,
          z: 0,
          yaw: 0,
        });
        return [pose.x, pose.z];
      }),
      sweptHalfWidthMeters: 1.1,
      occupancy: { enterMs: entry.release * 1000, exitMs: (entry.release + DRIVE_SECONDS) * 1000 },
    })),
    conflicts: [],
    simultaneousMovement:
      scenario.id === "together"
        ? [{ trajectoryIds: ["path-a", "path-b"], assessment: "candidate" }]
        : [],
  };
}
export function analysisOf(scenario: TrainingScenario) {
  return analyzeTrafficSituation(situationOf(scenario), UA_PDR_REFERENCES);
}
