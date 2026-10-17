import { UA_PDR_REFERENCES } from "@traffic-laws/country-rules/ua-pdr-references";
import { createScene, validateScene } from "@traffic-laws/scene-engine";
import { validateScenarios, type Scenario } from "./index";

const greenScene = createScene();
const redScene = createScene();
const redSouthLight = redScene.objects.find((object) => object.instanceId === "light-s");
if (!redSouthLight) throw new Error("У пресеті немає південного світлофора");
redSouthLight.properties.signal = "red";

const uncontrolledScene = createScene();
for (const object of uncontrolledScene.objects)
  if (object.assetId === "traffic-light.standard") object.properties.signal = "off";

/** Authored study drafts. Correct-answer choices and scene interpretation await human review. */
export const EDUCATIONAL_DEMO_SCENARIOS: Scenario[] = validateScenarios(
  [
    {
      schemaVersion: 1,
      revision: 1,
      id: "draft-ua-red-signal",
      country: "UA",
      language: "uk",
      category: "Сигнали світлофора",
      question:
        "Умовна ситуація: для вашого напрямку горить основний червоний сигнал, додаткова секція не ввімкнена, регулювальника немає. Що означає червоний сигнал?",
      answers: [
        { id: "stop", text: "Рух заборонено" },
        { id: "go", text: "Рух дозволено, якщо не видно інших авто" },
        { id: "yield", text: "Достатньо поступитися іншим авто" },
      ],
      correctAnswerId: "stop",
      explanation:
        "Пункт 16.1 описує регульоване перехрестя; підпункт 8.7.3 е ПДР забороняє рух на червоний сигнал. Умови задачі виключають додаткову секцію; чернетка ще потребує змістової перевірки.",
      ruleReferences: ["ua-pdr-16.1", "ua-pdr-8.7.3-e"],
      sceneReference: { kind: "snapshot", scene: validateScene(redScene) },
      trafficDecision: {
        situation: {
          schemaVersion: 1,
          id: "red-signal",
          country: "UA",
          intersection: {
            layout: "cross",
            control: "signals",
            regulator: "absent",
            pedestrians: "absent",
            otherRoadUsers: "absent",
            specialSignalSections: "absent",
            exitBlocked: "no",
          },
          lanes: [
            {
              id: "south",
              approach: "south",
              indexFromRight: 1,
              maneuverRestriction: "none",
              maneuverPermissions: [],
            },
          ],
          vehicles: [
            {
              id: "driver",
              laneId: "south",
              intendedManeuver: "straight",
              vehicleType: "non-rail",
              sceneInstanceId: "vehicle-sedan",
            },
          ],
          signs: [],
          signals: [
            {
              id: "south-light",
              indication: "red",
              mode: "main",
              laneIds: ["south"],
              sceneInstanceId: "light-s",
            },
          ],
          trajectories: [
            {
              id: "driver-path",
              vehicleId: "driver",
              points: [
                [2.4, 12],
                [2.4, -12],
              ],
              sweptHalfWidthMeters: 1,
              occupancy: { enterMs: 0, exitMs: 1000 },
            },
          ],
          conflicts: [],
          simultaneousMovement: [],
        },
        claim: { kind: "prohibited", vehicleId: "driver", affirmativeAnswerId: "stop" },
      },
      contentStatus: { state: "in_review" },
    },
    {
      schemaVersion: 1,
      revision: 1,
      id: "draft-ua-left-turn-green",
      country: "UA",
      language: "uk",
      category: "Поворот на перехресті",
      question:
        "Умовна ситуація: водій легкового автомобіля повертає ліворуч на основний зелений сигнал. Зустрічний автомобіль рухається прямо. Як діяти водієві, що повертає?",
      answers: [
        { id: "yield", text: "Дати дорогу зустрічному автомобілю" },
        { id: "first", text: "Проїхати першим лише тому, що горить зелений" },
        { id: "stop-forever", text: "Вважати лівий поворот забороненим за будь-яких умов" },
      ],
      correctAnswerId: "yield",
      explanation:
        "Пункт 16.1 описує регульоване перехрестя, підпункт 8.7.3 а — зелений сигнал, а пункт 16.6 встановлює обов’язок поступитися зустрічному транспорту, що їде прямо або праворуч, під час лівого повороту на основний зелений. Сцена і відповідь є чернеткою для ручної перевірки.",
      ruleReferences: ["ua-pdr-16.1", "ua-pdr-8.7.3-a", "ua-pdr-16.6"],
      sceneReference: { kind: "snapshot", scene: validateScene(greenScene) },
      trafficDecision: {
        situation: {
          schemaVersion: 1,
          id: "left-turn-green",
          country: "UA",
          intersection: {
            layout: "cross",
            control: "signals",
            regulator: "absent",
            pedestrians: "absent",
            otherRoadUsers: "absent",
            specialSignalSections: "absent",
            exitBlocked: "no",
          },
          lanes: [
            {
              id: "south",
              approach: "south",
              indexFromRight: 1,
              maneuverRestriction: "none",
              maneuverPermissions: [],
            },
            {
              id: "north",
              approach: "north",
              indexFromRight: 1,
              maneuverRestriction: "none",
              maneuverPermissions: [],
            },
          ],
          vehicles: [
            {
              id: "turning",
              laneId: "south",
              intendedManeuver: "left",
              vehicleType: "non-rail",
              sceneInstanceId: "vehicle-sedan",
            },
            {
              id: "oncoming",
              laneId: "north",
              intendedManeuver: "straight",
              vehicleType: "non-rail",
              sceneInstanceId: "vehicle-suv",
            },
          ],
          signs: [],
          signals: [
            {
              id: "south-light",
              indication: "green",
              mode: "main",
              laneIds: ["south"],
              sceneInstanceId: "light-s",
            },
            {
              id: "north-light",
              indication: "green",
              mode: "main",
              laneIds: ["north"],
              sceneInstanceId: "light-n",
            },
          ],
          trajectories: [
            {
              id: "turning-path",
              vehicleId: "turning",
              points: [
                [2.4, 12],
                [2.4, 0],
                [-12, 0],
              ],
              sweptHalfWidthMeters: 1,
              occupancy: { enterMs: 0, exitMs: 1000 },
            },
            {
              id: "oncoming-path",
              vehicleId: "oncoming",
              points: [
                [-2.4, -13],
                [-2.4, 12],
              ],
              sweptHalfWidthMeters: 1,
              occupancy: { enterMs: 0, exitMs: 1000 },
            },
          ],
          conflicts: [
            {
              firstTrajectoryId: "turning-path",
              secondTrajectoryId: "oncoming-path",
              kind: "crossing",
            },
          ],
          simultaneousMovement: [
            { trajectoryIds: ["turning-path", "oncoming-path"], assessment: "undetermined" },
          ],
        },
        claim: {
          kind: "yield",
          fromVehicleId: "turning",
          toVehicleId: "oncoming",
          affirmativeAnswerId: "yield",
        },
      },
      contentStatus: { state: "in_review" },
    },
    {
      schemaVersion: 1,
      revision: 1,
      id: "draft-ua-secondary-road",
      country: "UA",
      language: "uk",
      category: "Нерегульовані перехрестя",
      question:
        "Умовна ситуація: світлофор вимкнено, регулювальника немає, а перехрестя має головну й другорядну дороги. Кому має дати дорогу водій із другорядної дороги?",
      answers: [
        {
          id: "main-road",
          text: "Транспорту, що наближається головною дорогою, незалежно від його подальшого напрямку",
        },
        { id: "nobody", text: "Нікому, бо світлофор вимкнений" },
        { id: "left-only", text: "Лише транспорту, який повертає ліворуч" },
      ],
      correctAnswerId: "main-road",
      explanation:
        "Пункт 16.1 пояснює, коли перехрестя стає нерегульованим; пункт 16.11 описує обов’язок водія з другорядної дороги. Застосування до конкретної 3D-сцени потребує ручної перевірки.",
      ruleReferences: ["ua-pdr-16.1", "ua-pdr-16.11"],
      sceneReference: { kind: "snapshot", scene: validateScene(uncontrolledScene) },
      trafficDecision: {
        situation: {
          schemaVersion: 1,
          id: "secondary-road",
          country: "UA",
          intersection: {
            layout: "cross",
            control: "signals",
            roadRelation: "main-secondary",
            mainRoadTurns: "no",
            regulator: "absent",
            pedestrians: "absent",
            otherRoadUsers: "absent",
            specialSignalSections: "absent",
            exitBlocked: "no",
          },
          lanes: [
            {
              id: "south",
              approach: "south",
              indexFromRight: 1,
              roadPriority: "secondary",
              maneuverRestriction: "none",
              maneuverPermissions: [],
            },
            {
              id: "west",
              approach: "west",
              indexFromRight: 1,
              roadPriority: "main",
              maneuverRestriction: "none",
              maneuverPermissions: [],
            },
          ],
          vehicles: [
            {
              id: "secondary",
              laneId: "south",
              intendedManeuver: "straight",
              vehicleType: "non-rail",
              sceneInstanceId: "vehicle-sedan",
            },
            {
              id: "main",
              laneId: "west",
              intendedManeuver: "straight",
              vehicleType: "non-rail",
              sceneInstanceId: "vehicle-ambulance",
            },
          ],
          signs: [
            {
              id: "yield-south",
              kind: "give-way",
              officialCode: null,
              laneIds: ["south"],
              sceneInstanceId: "sign-yield-s",
            },
            {
              id: "priority-west",
              kind: "priority",
              officialCode: null,
              laneIds: ["west"],
              sceneInstanceId: "sign-priority-w",
            },
          ],
          signals: [
            {
              id: "south-light",
              indication: "off",
              mode: "main",
              laneIds: ["south"],
              sceneInstanceId: "light-s",
            },
            {
              id: "west-light",
              indication: "off",
              mode: "main",
              laneIds: ["west"],
              sceneInstanceId: "light-w",
            },
          ],
          trajectories: [
            {
              id: "secondary-path",
              vehicleId: "secondary",
              points: [
                [2.4, 12],
                [2.4, -12],
              ],
              sweptHalfWidthMeters: 1,
              occupancy: { enterMs: 0, exitMs: 1000 },
            },
            {
              id: "main-path",
              vehicleId: "main",
              points: [
                [-13, 2.4],
                [13, 2.4],
              ],
              sweptHalfWidthMeters: 1,
              occupancy: { enterMs: 0, exitMs: 1000 },
            },
          ],
          conflicts: [
            {
              firstTrajectoryId: "secondary-path",
              secondTrajectoryId: "main-path",
              kind: "crossing",
            },
          ],
          simultaneousMovement: [
            { trajectoryIds: ["secondary-path", "main-path"], assessment: "undetermined" },
          ],
        },
        claim: {
          kind: "yield",
          fromVehicleId: "secondary",
          toVehicleId: "main",
          affirmativeAnswerId: "main-road",
        },
      },
      contentStatus: { state: "in_review" },
    },
  ],
  { rules: UA_PDR_REFERENCES },
);
