import {
  parseSceneJSON,
  serializeScene,
  validateScene,
  type SceneDefinition,
} from "@traffic-laws/scene-engine";
export const STORAGE_KEY = "traffic-laws.scene-composer.v1";
export const MAX_SAVED_SCENES = 20;
export interface SceneWorkspace {
  draft: SceneDefinition;
  saved: SceneDefinition[];
}
export function encodeWorkspace(workspace: SceneWorkspace) {
  return JSON.stringify({
    version: 1,
    draft: validateScene(workspace.draft),
    saved: workspace.saved.map(validateScene),
  });
}
export function decodeWorkspace(raw: string): SceneWorkspace {
  if (raw.length > 4_000_000) throw new Error("Локальне сховище перевищує ліміт");
  const value: unknown = JSON.parse(raw);
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 1 ||
    !("draft" in value) ||
    !("saved" in value) ||
    !Array.isArray(value.saved) ||
    value.saved.length > MAX_SAVED_SCENES
  )
    throw new Error("Пошкоджене локальне сховище сцен");
  const saved = value.saved.map(validateScene);
  if (new Set(saved.map((scene) => scene.id)).size !== saved.length)
    throw new Error("Повторні ID збережених сцен");
  return { draft: validateScene(value.draft), saved };
}
export { parseSceneJSON as importScene, serializeScene as exportScene };
