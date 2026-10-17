import type { CountryRule } from "@traffic-laws/country-rules";
import {
  analyzeTrafficSituation,
  type TrafficAnalysis,
} from "@traffic-laws/country-rules/traffic-rules-engine";
import type { TrafficSituation, Maneuver } from "@traffic-laws/country-rules/traffic-situation";
import type { SceneDefinition } from "@traffic-laws/scene-engine";
import type { ScenarioClaim } from "./scenario-claim";
import { assessSceneBinding, type BindingFinding, type SceneTrafficBinding } from "./scene-binding";

export interface DecisionParticipant {
  vehicleId: string;
  sceneInstanceId: string | null;
  laneId: string;
  maneuver: Maneuver;
  admission: TrafficAnalysis["maneuvers"][number]["status"];
  trajectory: TrafficSituation["trajectories"][number] | null;
  yieldsToVehicleIds: string[];
  conflictingVehicleIds: string[];
}
export interface SharedScenarioDecision {
  situationId: string;
  analysis: TrafficAnalysis;
  participants: DecisionParticipant[];
  claimSupported: boolean;
  sceneFindings: BindingFinding[];
}

/** One pure decision used by scenario validation, answer feedback and 3D presentation. */
export function evaluateScenarioDecision(
  scene: SceneDefinition,
  situation: TrafficSituation,
  claim: ScenarioClaim,
  rules: readonly CountryRule[],
  binding?: SceneTrafficBinding,
): SharedScenarioDecision {
  const analysis = analyzeTrafficSituation(situation, rules);
  const participants = situation.vehicles.map((vehicle): DecisionParticipant => {
    const path = situation.trajectories.find((entry) => entry.vehicleId === vehicle.id);
    return {
      vehicleId: vehicle.id,
      sceneInstanceId: vehicle.sceneInstanceId,
      laneId: vehicle.laneId,
      maneuver: vehicle.intendedManeuver,
      admission:
        analysis.maneuvers.find((entry) => entry.vehicleId === vehicle.id)?.status ?? "unknown",
      trajectory: path ?? null,
      yieldsToVehicleIds: analysis.yieldObligations
        .filter((edge) => edge.fromVehicleId === vehicle.id)
        .map((edge) => edge.toVehicleId),
      conflictingVehicleIds: analysis.pathConflicts
        .filter((pair) => pair.firstVehicleId === vehicle.id || pair.secondVehicleId === vehicle.id)
        .filter(
          (pair) => pair.sweptGeometry === "intersects" && pair.temporal === "possible-overlap",
        )
        .map((pair) =>
          pair.firstVehicleId === vehicle.id ? pair.secondVehicleId : pair.firstVehicleId,
        ),
    };
  });
  const claimSupported =
    claim.kind === "yield"
      ? analysis.yieldObligations.some(
          (edge) =>
            edge.fromVehicleId === claim.fromVehicleId && edge.toVehicleId === claim.toVehicleId,
        )
      : analysis.maneuvers.some(
          (entry) => entry.vehicleId === claim.vehicleId && entry.status === "prohibited",
        );
  const sceneFindings = assessSceneBinding(scene, situation, binding);
  return {
    situationId: situation.id,
    analysis,
    participants,
    claimSupported,
    sceneFindings,
  };
}
