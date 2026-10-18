import { validateScene, type SceneDefinition } from "@traffic-laws/scene-engine";

export function previewScene(input: unknown): { scene: SceneDefinition | null; invalid: boolean } {
  if (input === null || input === undefined) return { scene: null, invalid: false };
  try {
    return { scene: validateScene(input), invalid: false };
  } catch {
    return { scene: null, invalid: true };
  }
}
