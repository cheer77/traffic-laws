import urban from "./urban-intersection.json";
import { validateScene } from "./definition";
export const SCENE_PRESETS = [{ id: "urban-intersection", name: "Міське перехрестя" }] as const;
export type ScenePresetId = (typeof SCENE_PRESETS)[number]["id"];
export function createScene(preset: ScenePresetId = "urban-intersection") {
  if (preset !== "urban-intersection") throw new Error("Невідомий пресет сцени");
  return validateScene(urban);
}
