import type { SharedScenarioDecision } from "@traffic-laws/scenarios/scenario-decision";
import type { SceneDefinition } from "@traffic-laws/scene-engine";

export interface OverlayVehicle {
  vehicleId: string;
  center: [number, number, number];
  emphasized: boolean;
  conflict: boolean;
  route: null | {
    segments: { center: [number, number, number]; length: number; angle: number }[];
    end: [number, number, number];
  };
}

/** Geometry-only presentation data derived from the already evaluated decision. */
export function createScenarioOverlayModel(
  scene: SceneDefinition,
  decision: SharedScenarioDecision,
  selectedVehicleId: string | null,
): OverlayVehicle[] {
  const objects = new Map(scene.objects.map((object) => [object.instanceId, object]));
  return decision.participants.flatMap((participant): OverlayVehicle[] => {
    const object = participant.sceneInstanceId && objects.get(participant.sceneInstanceId);
    if (!object) return [];
    const [x, , z] = object.transform.position;
    const points = participant.trajectory?.points;
    const route = points
      ? {
          segments: points.slice(1).map(([endX, endZ], index) => {
            const [startX, startZ] = points[index];
            const dx = endX - startX,
              dz = endZ - startZ;
            return {
              center: [(startX + endX) / 2, 0.26, (startZ + endZ) / 2] as [number, number, number],
              length: Math.hypot(dx, dz),
              angle: Math.atan2(-dz, dx),
            };
          }),
          end: [points[points.length - 1][0], 0.3, points[points.length - 1][1]] as [
            number,
            number,
            number,
          ],
        }
      : null;
    return [
      {
        vehicleId: participant.vehicleId,
        center: [x, 0.18, z],
        emphasized: participant.vehicleId === selectedVehicleId,
        conflict: participant.conflictingVehicleIds.length > 0,
        route,
      },
    ];
  });
}
