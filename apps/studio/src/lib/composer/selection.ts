import { ASSET_METADATA, VEHICLE_KINDS, type SceneDefinition } from "@traffic-laws/scene-engine";
import { SCENE_ASSET_BY_ID, type SceneAsset } from "@/lib/sceneAssets";
export function sceneAsset(scene: SceneDefinition, id: string, preview = false): SceneAsset {
  const object = !preview && scene.objects.find((object) => object.instanceId === id);
  if (object) {
    const metadata = ASSET_METADATA.get(object.assetId)!;
    return {
      id,
      name: metadata.name,
      type: metadata.category,
      position: object.transform.position,
      rotation: object.transform.rotation[1],
      size: Math.max(...metadata.dimensions) * object.transform.scale[0],
      vehicle: VEHICLE_KINDS[object.assetId],
      layer: SCENE_ASSET_BY_ID[id]?.layer,
    };
  }
  return (
    SCENE_ASSET_BY_ID[id] ?? {
      id,
      name: "Об’єкт не вибрано",
      type: "",
      position: [0, 0, 0],
      rotation: 0,
      size: 4,
    }
  );
}
