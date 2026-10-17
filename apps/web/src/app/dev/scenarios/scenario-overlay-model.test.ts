import { describe, expect, it } from "vitest";
import { UA_PDR_REFERENCES } from "@traffic-laws/country-rules/ua-pdr-references";
import { EDUCATIONAL_DEMO_SCENARIOS } from "@traffic-laws/scenarios/education-demo";
import { evaluateScenarioDecision } from "@traffic-laws/scenarios/scenario-decision";
import { createScenarioOverlayModel } from "./scenario-overlay-model";

describe("development 3D decision overlay", () => {
  it("uses evaluated participant IDs, author paths, selection and conflict flags", () => {
    for (const scenario of EDUCATIONAL_DEMO_SCENARIOS) {
      const scene = scenario.sceneReference?.scene;
      const traffic = scenario.trafficDecision;
      if (!scene || !traffic) throw new Error("missing demonstration fixture");
      const decision = evaluateScenarioDecision(
        scene,
        traffic.situation,
        traffic.claim,
        UA_PDR_REFERENCES,
        traffic.sceneBinding,
      );
      const visual = createScenarioOverlayModel(
        scene,
        decision,
        decision.participants[0].vehicleId,
      );
      expect(visual.map((item) => item.vehicleId)).toEqual(
        decision.participants.map((item) => item.vehicleId),
      );
      expect(visual.filter((item) => item.emphasized).map((item) => item.vehicleId)).toEqual([
        decision.participants[0].vehicleId,
      ]);
      for (const participant of decision.participants) {
        const marker = visual.find((item) => item.vehicleId === participant.vehicleId);
        expect(marker?.route?.segments).toHaveLength(
          (participant.trajectory?.points.length ?? 1) - 1,
        );
        expect(marker?.conflict).toBe(participant.conflictingVehicleIds.length > 0);
      }
      const overlayMeshes = visual.reduce(
        (count, vehicle) => count + 1 + (vehicle.route ? vehicle.route.segments.length + 1 : 0),
        0,
      );
      expect(overlayMeshes).toBeLessThanOrEqual(7);
    }
  });
});
