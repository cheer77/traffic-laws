import type { Direction } from "@traffic-laws/country-rules/traffic-situation";
import type { SceneDefinition } from "@traffic-laws/scene-engine";
import type { MotionPlan } from "./motion";
import { DRIVE_SECONDS } from "./motion";
import { OFFICIAL_TICKET_SCENES } from "./official-scenes";
import imported from "../official-tickets/imported.json";
import { parseImportedTickets } from "../official-tickets/pipeline";

export interface TrainingCar extends MotionPlan {
  id: string;
  sceneInstanceId: string;
  label: string;
  kind: "sedan" | "suv";
  color: string;
  startDistance?: number;
}
export interface TrainingScenario {
  id: string;
  number: number;
  title: string;
  summary: string;
  question: string;
  answer: { options: string[]; correct: number | null };
  image?: { src: string; width: number; height: number; sha256: string; sourcePage: number };
  answerSourcePage: number;
  section?: string;
  importReason?: string;
  answerMethod?: string;
  cars: TrainingCar[];
  scene?: SceneDefinition;
  signalChange?: number;
}

const image = (
  number: number,
  width: number,
  height: number,
  sha256: string,
  sourcePage: number,
): TrainingScenario["image"] => ({
  src: `/official-tickets/section-16-1/16-1-${String(number).padStart(2, "0")}.jpeg`,
  width,
  height,
  sha256,
  sourcePage,
});
const movingCar = (
  id: string,
  label: string,
  approach: Direction,
  maneuver: MotionPlan["maneuver"],
  release: number,
  color: string,
  kind: TrainingCar["kind"] = "sedan",
  startDistance?: number,
  stopDistance?: number,
  initialDistance?: number,
): TrainingCar => ({
  id,
  sceneInstanceId: `car-${id}`,
  label,
  approach,
  maneuver,
  release,
  color,
  kind,
  startDistance,
  stopDistance,
  initialDistance,
});

/** Retained authored drafts; these are not verified automatic reconstructions. */
export const AUTHORED_TRAINING_DRAFTS: TrainingScenario[] = [
  {
    id: "ua-16-1-01",
    number: 1,
    title: "Сигнал додаткової секції",
    summary: "Офіційне зображення · 2D + 3D",
    question:
      "Як повинен у даній ситуації вчинити водій білого автомобіля, який очікує ввімкнення сигналу світлофора, що дозволяє рух, щоб їхати прямо?",
    answer: {
      options: [
        "Продовжити рух у наміченому напрямку, тільки коли буде увімкнено зелений сигнал світлофора.",
        "Увімкнути лівий покажчик повороту, продовжити рух у напрямку, вказаному стрілкою, увімкненою в додатковій секції.",
        "Перестроїтися в правий ряд.",
      ],
      correct: 1,
    },
    image: image(
      1,
      570,
      447,
      "e63f59deafb549b05ea897a74e36cfee6dbf2923f31a5c2819fc7a34c354838b",
      173,
    ),
    answerSourcePage: 4,
    cars: [movingCar("white", "Білий автомобіль", "south", "left", 0, "#f4f4ef", "sedan", -4.6)],
    scene: OFFICIAL_TICKET_SCENES["ua-16-1-01"],
  },
  {
    id: "ua-16-1-02",
    number: 2,
    title: "Поворот праворуч перед трамваями",
    summary: "Офіційне зображення · 2D",
    question: "Повертаючи праворуч, водій синього автомобіля повинен:",
    answer: {
      options: [
        "Проїхати перехрестя першим.",
        "Дати дорогу тільки зустрічному трамваю.",
        "Дати дорогу обом трамваям.",
        "Дати дорогу тільки попутному трамваю.",
      ],
      correct: 2,
    },
    image: image(
      2,
      514,
      362,
      "6e01443e0e3a0939ae185de4cffbbeba7cc24ad1f40f225df45fd212b09a7595",
      174,
    ),
    answerSourcePage: 4,
    cars: [],
  },
  {
    id: "ua-16-1-03",
    number: 3,
    title: "Перевага трамвая",
    summary: "Офіційне зображення · 2D",
    question: "Який транспортний засіб у даній ситуації має перевагу в русі?",
    answer: { options: ["Трамвай.", "Автомобіль."], correct: 0 },
    image: image(
      3,
      746,
      369,
      "15a867f150992c9811f4d48ff5332c880e2094c95a6417dececdb1fcc23d6651",
      174,
    ),
    answerSourcePage: 4,
    cars: [],
  },
  {
    id: "ua-16-1-04",
    number: 4,
    title: "Завершення повороту ліворуч",
    summary: "Офіційне зображення · 2D + 3D",
    question:
      "Як повинен вчинити водій білого автомобіля, якщо він виїхав на перехрещення проїзних частин на сигнал світлофора, що дозволяє рух?",
    answer: {
      options: [
        "Зупинитися перед світлофором на шляху руху і, дочекавшись ввімкнення зеленого сигналу, продовжити рух.",
        "Закінчити поворот ліворуч незалежно від сигналу світлофора на шляху свого руху.",
      ],
      correct: 1,
    },
    image: image(
      4,
      628,
      346,
      "5a2ad992cb7ae130caa764b8aa415a6b4c209f5b6d4458a67991395906772180",
      174,
    ),
    answerSourcePage: 4,
    cars: [movingCar("white", "Білий автомобіль", "south", "left", 0, "#f4f4ef", "sedan", 12)],
    scene: OFFICIAL_TICKET_SCENES["ua-16-1-04"],
  },
  {
    id: "ua-16-1-05",
    number: 5,
    title: "Стоп-лінія на шляху руху",
    summary: "Офіційне зображення · 2D + 3D",
    question:
      "Як повинен вчинити водій білого автомобіля, що виїхав на перехрещення проїзних частин на зелений сигнал світлофора?",
    answer: {
      options: [
        "Повинен продовжувати рух у наміченому напрямку, незважаючи на ввімкнений заборонний сигнал світлофора.",
        "Повинен зупинитися перед дорожньою розміткою «Стоп-лінія» і продовжити рух, коли ввімкнеться зелений сигнал світлофора.",
      ],
      correct: 1,
    },
    image: image(
      5,
      536,
      432,
      "04066c23b6357e9a8ac7023cbcad24ddbae90191b793880aceb8a7b2b850b240",
      175,
    ),
    answerSourcePage: 4,
    cars: [
      movingCar(
        "white",
        "Білий автомобіль",
        "south",
        "straight",
        6,
        "#f4f4ef",
        "sedan",
        undefined,
        22,
        5.4,
      ),
    ],
    scene: OFFICIAL_TICKET_SCENES["ua-16-1-05"],
    signalChange: 6,
  },
  {
    id: "ua-16-1-06",
    number: 6,
    title: "Лівий поворот і стоп-лінія",
    summary: "Офіційне зображення · 2D + 3D",
    question: "Як повинен діяти водій зеленого автомобіля, що повертає ліворуч, у даній ситуації?",
    answer: {
      options: [
        "Виїхати в наміченому напрямку незалежно від сигналу світлофора на шляху свого руху.",
        "Зупинитися перед дорожньою розміткою «Стоп-лінія» і продовжити рух, коли ввімкнеться зелений сигнал світлофора.",
      ],
      correct: 1,
    },
    image: image(
      6,
      533,
      387,
      "a4f7c21075c8a73f3df217128f605a05ec1775bc8c6bf7c854df7b648e160b3c",
      175,
    ),
    answerSourcePage: 4,
    cars: [
      movingCar(
        "green",
        "Зелений автомобіль",
        "south",
        "left",
        6,
        "#63804f",
        "suv",
        undefined,
        22,
        -2.6,
      ),
    ],
    scene: OFFICIAL_TICKET_SCENES["ua-16-1-06"],
    signalChange: 6,
  },
  {
    id: "ua-16-1-07",
    number: 7,
    title: "Автомобіль і трамвай",
    summary: "Офіційне зображення · 2D",
    question: "Хто в даній ситуації повинен дати дорогу?",
    answer: { options: ["Водій автомобіля.", "Водій трамвая."], correct: 1 },
    image: image(
      7,
      820,
      457,
      "9dd36a1d26621fe38da6edf3c564c40da6287aeeaccc290f66fd3b5e9f4aa476",
      175,
    ),
    answerSourcePage: 4,
    cars: [],
  },
  {
    id: "ua-16-1-08",
    number: 8,
    title: "Черговість на регульованому перехресті",
    summary: "Офіційне зображення · 2D + 3D",
    question: "Який транспортний засіб першим проїде дане перехрестя?",
    answer: { options: ["Червоний автомобіль.", "Синій автомобіль."], correct: 0 },
    image: image(
      8,
      791,
      410,
      "b5602457ef20981fadf7469bb464bd43218a301814ef18e87e5d55b39e4c970b",
      176,
    ),
    answerSourcePage: 4,
    cars: [
      movingCar("red", "Червоний автомобіль", "west", "straight", 0, "#c8342f"),
      movingCar("blue", "Синій автомобіль", "south", "straight", 8, "#3979b8"),
    ],
    scene: OFFICIAL_TICKET_SCENES["ua-16-1-08"],
    signalChange: 7,
  },
  {
    id: "ua-16-1-09",
    number: 9,
    title: "Велосипедист і трамвай",
    summary: "Офіційне зображення · 2D",
    question: "Як велосипедист проїде перехрестя в даному випадку?",
    answer: { options: ["Дасть дорогу трамваю.", "Проїде першим, маючи перевагу."], correct: 1 },
    image: image(
      9,
      817,
      509,
      "0c48676d2a5c1b50376c9287d6767b8610b789adcac5d2f46d991b89a8c065f0",
      176,
    ),
    answerSourcePage: 4,
    cars: [],
  },
  {
    id: "ua-16-1-10",
    number: 10,
    title: "Поворот на зелену стрілку",
    summary: "Офіційне зображення · 2D",
    question:
      "Як повинен вчинити водій червоного автомобіля, що збирається повертати праворуч, у даній ситуації?",
    answer: {
      options: [
        "Продовжити рух тільки після ввімкнення зеленого сигналу світлофора.",
        "Повернути праворуч, давши дорогу пішоходам і транспортним засобам, які рухаються з інших напрямків.",
        "Повернути праворуч, давши дорогу лише транспортним засобам, що рухаються з інших напрямків.",
      ],
      correct: 1,
    },
    image: image(
      10,
      668,
      450,
      "1203e9bc8c6d633b610037d421b40f92cf7671e00a43bad538c3fe8cf6205d9a",
      176,
    ),
    answerSourcePage: 4,
    cars: [],
  },
];

/** School uses extracted data only; authored 3D drafts never grant the 3D toggle. */
export const TRAINING_SCENARIOS: TrainingScenario[] = parseImportedTickets(imported).map(
  (ticket) => ({
    id: ticket.id,
    number: ticket.number,
    section: ticket.section,
    title: `Розділ ${ticket.section} · Питання ${ticket.number}`,
    summary: "Оригінал 2D · потребує перевірки",
    question: ticket.question,
    answer: { options: ticket.options, correct: ticket.answer?.index ?? null },
    image: ticket.images[0],
    answerSourcePage: ticket.answer?.page ?? 0,
    answerMethod: ticket.answer?.method,
    importReason: ticket.classification.reason,
    cars: [],
  }),
);

export function durationOf(scenario: TrainingScenario): number {
  return scenario.cars.length
    ? Math.max(...scenario.cars.map((entry) => entry.release + DRIVE_SECONDS))
    : 0;
}
export function checkAnswer(scenario: TrainingScenario, choice: number | null): boolean {
  return scenario.answer.correct !== null && choice !== null && choice === scenario.answer.correct;
}
