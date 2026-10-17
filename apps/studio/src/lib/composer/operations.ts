import {
  ASSET_METADATA,
  validateScene,
  type SceneDefinition,
  type SceneObject,
  type Transform,
} from "@traffic-laws/scene-engine";
import type { AssetId } from "@traffic-laws/assets-3d/registry";

function nextId(scene: SceneDefinition, prefix: string) {
  let index = 1;
  const ids = new Set(scene.objects.map((object) => object.instanceId));
  while (ids.has(`${prefix}-${index}`)) index++;
  return `${prefix}-${index}`;
}
export function addObject(scene: SceneDefinition, assetId: AssetId): SceneDefinition {
  const metadata = ASSET_METADATA.get(assetId)!;
  const collection = ["intersections", "vegetation", "street-furniture"].includes(
    metadata.category,
  );
  const object: SceneObject = {
    instanceId: nextId(scene, "object"),
    assetId,
    transform: {
      position: [0, collection ? 0 : -metadata.boundingBox.min[1], 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
    properties:
      metadata.category === "traffic-lights"
        ? { signal: "red" }
        : metadata.category === "vehicles"
          ? { headlights: true }
          : {},
  };
  return validateScene({ ...scene, objects: [...scene.objects, object] });
}
export function updateObject(
  scene: SceneDefinition,
  instanceId: string,
  update: Partial<Pick<SceneObject, "transform" | "properties">>,
) {
  if (!scene.objects.some((object) => object.instanceId === instanceId))
    throw new Error("Об’єкт не знайдено");
  return validateScene({
    ...scene,
    objects: scene.objects.map((object) =>
      object.instanceId === instanceId ? { ...object, ...update } : object,
    ),
  });
}
export function removeObject(scene: SceneDefinition, instanceId: string) {
  return validateScene({
    ...scene,
    objects: scene.objects.filter((object) => object.instanceId !== instanceId),
  });
}
export function duplicateObject(scene: SceneDefinition, instanceId: string) {
  const original = scene.objects.find((object) => object.instanceId === instanceId);
  if (!original) throw new Error("Об’єкт не знайдено");
  return validateScene({
    ...scene,
    objects: [
      ...scene.objects,
      {
        ...original,
        instanceId: nextId(scene, "copy"),
        transform: {
          ...original.transform,
          position: [
            Math.min(100, original.transform.position[0] + 3),
            original.transform.position[1],
            original.transform.position[2],
          ],
        },
      },
    ],
  });
}
export const IDENTITY_TRANSFORM: Transform = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
};
