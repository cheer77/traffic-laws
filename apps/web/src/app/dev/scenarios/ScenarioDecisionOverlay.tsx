"use client";

import { useMemo } from "react";
import { DoubleSide } from "three";
import type { SharedScenarioDecision } from "@traffic-laws/scenarios/scenario-decision";
import type { SceneDefinition } from "@traffic-laws/scene-engine";
import { createScenarioOverlayModel, type OverlayVehicle } from "./scenario-overlay-model";

function PlannedPath({ vehicle }: { vehicle: OverlayVehicle }) {
  if (!vehicle.route) return null;
  const tint = vehicle.emphasized ? "#f59e0b" : vehicle.conflict ? "#d97706" : "#64748b";
  return (
    <group name="authored-maneuver-path">
      {vehicle.route.segments.map((segment, index) => (
        <mesh
          key={index}
          position={segment.center}
          rotation={[0, segment.angle, 0]}
          renderOrder={20}
        >
          <boxGeometry args={[segment.length, 0.035, vehicle.emphasized ? 0.28 : 0.18]} />
          <meshBasicMaterial
            color={tint}
            depthTest={false}
            depthWrite={false}
            transparent
            opacity={vehicle.emphasized ? 0.95 : 0.7}
          />
        </mesh>
      ))}
      <mesh position={vehicle.route.end} renderOrder={21}>
        <sphereGeometry args={[vehicle.emphasized ? 0.38 : 0.27, 12, 8]} />
        <meshBasicMaterial color={tint} depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Neutral draft markers; colors encode selection/conflict, never legal permission. */
export default function ScenarioDecisionOverlay({
  scene,
  decision,
  selectedVehicleId,
}: {
  scene: SceneDefinition;
  decision: SharedScenarioDecision;
  selectedVehicleId: string | null;
}) {
  const vehicles = useMemo(
    () => createScenarioOverlayModel(scene, decision, selectedVehicleId),
    [scene, decision, selectedVehicleId],
  );
  return (
    <group name={`draft-decision-${decision.situationId}`}>
      {vehicles.map((vehicle) => (
        <group key={vehicle.vehicleId} name={`draft-participant-${vehicle.vehicleId}`}>
          <mesh position={vehicle.center} rotation={[-Math.PI / 2, 0, 0]} renderOrder={21}>
            <ringGeometry args={[1.5, vehicle.emphasized ? 1.95 : 1.75, 32]} />
            <meshBasicMaterial
              color={vehicle.emphasized ? "#f59e0b" : "#64748b"}
              transparent
              opacity={vehicle.emphasized ? 0.95 : 0.7}
              depthTest={false}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
          <PlannedPath vehicle={vehicle} />
        </group>
      ))}
    </group>
  );
}
