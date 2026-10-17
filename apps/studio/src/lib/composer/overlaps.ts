import { Box3, Euler, Matrix4, Quaternion, Vector3 } from "three";
import { ASSET_METADATA, type SceneDefinition } from "@traffic-laws/scene-engine";
/** Advisory world-axis bounds only, never collision detection or a road-rule decision. */
export function vehicleBoundsOverlaps(scene: SceneDefinition): Array<[string, string]> {
  const vehicles = scene.objects
    .filter((object) => ASSET_METADATA.get(object.assetId)!.category === "vehicles")
    .map((object) => {
      const bounds = ASSET_METADATA.get(object.assetId)!.boundingBox;
      const matrix = new Matrix4().compose(
        new Vector3(...object.transform.position),
        new Quaternion().setFromEuler(new Euler(...object.transform.rotation)),
        new Vector3(...object.transform.scale),
      );
      return {
        id: object.instanceId,
        box: new Box3(new Vector3(...bounds.min), new Vector3(...bounds.max)).applyMatrix4(matrix),
      };
    });
  const overlaps: Array<[string, string]> = [];
  for (let i = 0; i < vehicles.length; i++)
    for (let j = i + 1; j < vehicles.length; j++) {
      if (vehicles[i].box.intersectsBox(vehicles[j].box))
        overlaps.push([vehicles[i].id, vehicles[j].id]);
    }
  return overlaps;
}
