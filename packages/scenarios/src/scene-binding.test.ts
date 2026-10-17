import { describe, expect, it } from "vitest";
import { UA_PDR_REFERENCES } from "@traffic-laws/country-rules/ua-pdr-references";
import { EDUCATIONAL_DEMO_SCENARIOS } from "./education-demo";
import { parseScenarioJSON, serializeScenario, validateScenario } from "./index";
import { evaluateScenarioDecision } from "./scenario-decision";

const context = { rules: UA_PDR_REFERENCES };

describe("shared scenario decision and authored scene binding", () => {
  it("uses one decision for all three validated answer and 3D participant contracts", () => {
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
      expect(decision.claimSupported).toBe(true);
      expect(decision.analysis.technicalCertainty).toBe("determinate");
      expect(decision.analysis.normativeStatus).toBe("unverified");
      expect(decision.analysis.certainty).toBe("unsupported");
      expect(decision.participants.map((item) => item.vehicleId)).toEqual(
        traffic.situation.vehicles.map((item) => item.id),
      );
      for (const participant of decision.participants) {
        expect(
          scene.objects.some((object) => object.instanceId === participant.sceneInstanceId),
        ).toBe(true);
        expect(participant.admission).toBe(
          decision.analysis.maneuvers.find((entry) => entry.vehicleId === participant.vehicleId)
            ?.status,
        );
        expect(participant.trajectory?.vehicleId).toBe(participant.vehicleId);
      }
      expect(
        decision.sceneFindings.some(
          (item) => item.subject === "participant-activity" && item.evidence === "authored",
        ),
      ).toBe(true);
      expect(
        decision.sceneFindings.some(
          (item) => item.subject.startsWith("signal:") && item.evidence === "observed",
        ),
      ).toBe(true);
      expect(decision.sceneFindings.some((item) => item.status === "conflict")).toBe(false);
      expect(parseScenarioJSON(serializeScenario(scenario, context), context)).toEqual(scenario);
    }
    const red = EDUCATIONAL_DEMO_SCENARIOS[0];
    const left = EDUCATIONAL_DEMO_SCENARIOS[1];
    const secondary = EDUCATIONAL_DEMO_SCENARIOS[2];
    if (
      !red.sceneReference ||
      !red.trafficDecision ||
      !left.sceneReference ||
      !left.trafficDecision ||
      !secondary.sceneReference ||
      !secondary.trafficDecision
    )
      throw new Error("missing fixture");
    const redDecision = evaluateScenarioDecision(
      red.sceneReference.scene,
      red.trafficDecision.situation,
      red.trafficDecision.claim,
      UA_PDR_REFERENCES,
      red.trafficDecision.sceneBinding,
    );
    expect(redDecision.participants[0].admission).toBe("prohibited");
    const leftDecision = evaluateScenarioDecision(
      left.sceneReference.scene,
      left.trafficDecision.situation,
      left.trafficDecision.claim,
      UA_PDR_REFERENCES,
      left.trafficDecision.sceneBinding,
    );
    expect(
      leftDecision.participants.find((item) => item.vehicleId === "turning")?.yieldsToVehicleIds,
    ).toEqual(["oncoming"]);
    expect(
      leftDecision.participants.find((item) => item.vehicleId === "turning")?.conflictingVehicleIds,
    ).toEqual(["oncoming"]);
    const secondaryDecision = evaluateScenarioDecision(
      secondary.sceneReference.scene,
      secondary.trafficDecision.situation,
      secondary.trafficDecision.claim,
      UA_PDR_REFERENCES,
      secondary.trafficDecision.sceneBinding,
    );
    expect(
      secondaryDecision.participants.find((item) => item.vehicleId === "secondary")
        ?.yieldsToVehicleIds,
    ).toEqual(["main"]);
  });

  it("rejects unclassified, double-classified and broken scene/lane relationships", () => {
    const scenario = EDUCATIONAL_DEMO_SCENARIOS[1];
    const missing = structuredClone(scenario);
    missing.trafficDecision?.sceneBinding?.inactiveSceneInstanceIds.pop();
    expect(() => validateScenario(missing, context)).toThrow(/не задано активність/);
    const overlap = structuredClone(scenario);
    overlap.trafficDecision?.sceneBinding?.inactiveSceneInstanceIds.push("vehicle-sedan");
    expect(() => validateScenario(overlap, context)).toThrow(/активним і неактивним/);
    const missingControl = structuredClone(scenario);
    missingControl.trafficDecision?.sceneBinding?.outOfScopeControlInstanceIds.pop();
    expect(() => validateScenario(missingControl, context)).toThrow(/не задано застосовність/);
    const overlappingControl = structuredClone(scenario);
    overlappingControl.trafficDecision?.sceneBinding?.outOfScopeControlInstanceIds.push("light-s");
    expect(() => validateScenario(overlappingControl, context)).toThrow(
      /застосовним і поза умовою/,
    );
    const wrongRoad = structuredClone(scenario);
    if (!wrongRoad.trafficDecision?.sceneBinding) throw new Error("missing fixture");
    wrongRoad.trafficDecision.sceneBinding.laneRoadLinks[0].roadInstanceId = "light-s";
    expect(() => validateScenario(wrongRoad, context)).toThrow(/інше перехрестя/);
    const wrongSignalLane = structuredClone(scenario);
    if (!wrongSignalLane.trafficDecision) throw new Error("missing fixture");
    wrongSignalLane.trafficDecision.situation.signals[0].laneIds = ["north"];
    expect(() => validateScenario(wrongSignalLane, context)).toThrow(/signal:south-light/);
    const secondary = structuredClone(EDUCATIONAL_DEMO_SCENARIOS[2]);
    if (!secondary.trafficDecision) throw new Error("missing fixture");
    secondary.trafficDecision.situation.lanes[0].roadPriority = "main";
    expect(() => validateScenario(secondary, context)).toThrow(/sign-road:yield-south/);
  });

  it("keeps legacy traffic drafts valid but reports an unresolved binding", () => {
    const legacy = structuredClone(EDUCATIONAL_DEMO_SCENARIOS[0]);
    if (!legacy.trafficDecision || !legacy.sceneReference) throw new Error("missing fixture");
    delete legacy.trafficDecision.sceneBinding;
    const validated = validateScenario(legacy, context);
    const decision = evaluateScenarioDecision(
      validated.sceneReference!.scene,
      validated.trafficDecision!.situation,
      validated.trafficDecision!.claim,
      UA_PDR_REFERENCES,
    );
    expect(decision.sceneFindings).toContainEqual(
      expect.objectContaining({
        subject: "participant-activity",
        evidence: "unresolved",
        status: "missing",
      }),
    );
  });

  it("rejects incompatible official-source edition before accepting a claim", () => {
    const incompatible = UA_PDR_REFERENCES.map((rule) => ({
      ...rule,
      source: rule.source && { ...rule.source, editionDate: "2025-01-01" },
    }));
    expect(() => validateScenario(EDUCATIONAL_DEMO_SCENARIOS[0], { rules: incompatible })).toThrow(
      /однозначного технічного висновку/,
    );
  });
  it("reconstructs scene and binding instead of retaining mutable input objects", () => {
    const input = structuredClone(EDUCATIONAL_DEMO_SCENARIOS[0]);
    const validated = validateScenario(input, context);
    if (
      !input.sceneReference ||
      !input.trafficDecision?.sceneBinding ||
      !validated.sceneReference ||
      !validated.trafficDecision?.sceneBinding
    )
      throw new Error("missing fixture");
    input.sceneReference.scene.objects[0].transform.position[0] = 25;
    input.trafficDecision.sceneBinding.inactiveSceneInstanceIds[0] = "vehicle-sedan";
    expect(validated.sceneReference.scene.objects[0].transform.position[0]).toBe(0);
    expect(validated.trafficDecision.sceneBinding.inactiveSceneInstanceIds[0]).toBe("person-man");
  });
});
