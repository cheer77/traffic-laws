import { createScene, validateScene } from "@traffic-laws/scene-engine";
import { validateScenarios, type Scenario } from "./index";

const firstScene = createScene();
const secondScene = createScene();
const southLight = secondScene.objects.find((object) => object.instanceId === "light-s");
if (!southLight) throw new Error("Міський пресет не містить південного світлофора");
southLight.properties.signal = "red";

/** Technical, unverified examples. They make no legal or official-exam claim. */
export const DEMO_SCENARIOS: Scenario[] = validateScenarios(
  [
    {
      schemaVersion: 1,
      revision: 1,
      id: "demo-urban-green",
      country: "UA",
      language: "uk",
      category: "Технічна демонстрація",
      question: "Який сигнал налаштовано для південного світлофора?",
      answers: [
        { id: "green", text: "Зелений" },
        { id: "red", text: "Червоний" },
      ],
      correctAnswerId: "green",
      explanation:
        "У цьому знімку сцени для південного світлофора задано зелений сигнал. Це демонстрація даних сцени, а не правило дорожнього руху.",
      ruleReferences: [],
      sceneReference: { kind: "snapshot", scene: validateScene(firstScene) },
      contentStatus: { state: "draft" },
    },
    {
      schemaVersion: 1,
      revision: 1,
      id: "demo-urban-red",
      country: "UA",
      language: "uk",
      category: "Технічна демонстрація",
      question: "Який сигнал налаштовано для південного світлофора?",
      answers: [
        { id: "green", text: "Зелений" },
        { id: "red", text: "Червоний" },
      ],
      correctAnswerId: "red",
      explanation:
        "У другому знімку того самого міського пресета сигнал змінено на червоний. Жодного висновку про пріоритет руху тут немає.",
      ruleReferences: [],
      sceneReference: { kind: "snapshot", scene: validateScene(secondScene) },
      contentStatus: { state: "draft" },
    },
  ],
  { rules: [] },
);
