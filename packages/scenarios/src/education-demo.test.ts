import { describe, expect, it } from "vitest";
import { UA_PDR_REFERENCES } from "@traffic-laws/country-rules/ua-pdr-references";
import { EDUCATIONAL_DEMO_SCENARIOS } from "./education-demo";
import { publishScenario, validateScenarios } from "./index";
import { validateScenario } from "./index";
import { assessSceneConsistency } from "./scene-consistency";

describe("Ukrainian study drafts", () => {
  it("connects authored answers to existing scenes and official-source research records", () => {
    expect(EDUCATIONAL_DEMO_SCENARIOS).toHaveLength(3);
    expect(validateScenarios(EDUCATIONAL_DEMO_SCENARIOS, { rules: UA_PDR_REFERENCES })).toEqual(
      EDUCATIONAL_DEMO_SCENARIOS,
    );
    for (const scenario of EDUCATIONAL_DEMO_SCENARIOS) {
      expect(scenario.sceneReference?.scene.objects.length).toBeGreaterThan(0);
      expect(scenario.ruleReferences.length).toBeGreaterThan(0);
      expect(scenario.contentStatus.state).toBe("in_review");
      expect(() => publishScenario(scenario, { rules: UA_PDR_REFERENCES })).toThrow();
    }
  });
  it("keeps the original preset unchanged when the demonstration switches signals off", () => {
    const lastScene = EDUCATIONAL_DEMO_SCENARIOS[2].sceneReference?.scene;
    expect(
      lastScene?.objects
        .filter((object) => object.assetId === "traffic-light.standard")
        .every((object) => object.properties.signal === "off"),
    ).toBe(true);
  });
  it("rejects an answer, claim, rule trace or scene signal that disagrees with the engine", () => {
    const scenario = EDUCATIONAL_DEMO_SCENARIOS[1];
    const context = { rules: UA_PDR_REFERENCES };
    expect(scenario.trafficDecision).toBeDefined();
    expect(() => validateScenario({ ...scenario, correctAnswerId: "first" }, context)).toThrow(
      /correctAnswerId/,
    );
    expect(() =>
      validateScenario({ ...scenario, ruleReferences: ["ua-pdr-16.6"] }, context),
    ).toThrow(/відсутнє застосоване правило/);
    const decision = scenario.trafficDecision;
    if (!decision) throw new Error("missing fixture");
    expect(() =>
      validateScenario(
        {
          ...scenario,
          trafficDecision: {
            ...decision,
            claim: {
              kind: "yield",
              fromVehicleId: "oncoming",
              toVehicleId: "turning",
              affirmativeAnswerId: "yield",
            },
          },
        },
        context,
      ),
    ).toThrow(/суперечить результату движка/);
    const snapshot = scenario.sceneReference;
    if (!snapshot) throw new Error("missing scene fixture");
    const changed = structuredClone(snapshot.scene);
    const light = changed.objects.find((object) => object.instanceId === "light-s");
    if (!light) throw new Error("missing light fixture");
    light.properties.signal = "red";
    expect(() =>
      validateScenario(
        { ...scenario, sceneReference: { kind: "snapshot", scene: changed } },
        context,
      ),
    ).toThrow(/не збігається зі сценою/);
    const secondary = EDUCATIONAL_DEMO_SCENARIOS[2];
    const secondaryDecision = secondary.trafficDecision;
    if (!secondaryDecision) throw new Error("missing secondary fixture");
    expect(() =>
      validateScenario(
        {
          ...secondary,
          trafficDecision: {
            ...secondaryDecision,
            situation: {
              ...secondaryDecision.situation,
              signs: [
                { ...secondaryDecision.situation.signs[0], sceneInstanceId: "sign-priority-w" },
                secondaryDecision.situation.signs[1],
              ],
            },
          },
        },
        context,
      ),
    ).toThrow(/знак/);
  });
  it("blocks priority-dependent publication even if local review metadata is forged", () => {
    const scenario = EDUCATIONAL_DEMO_SCENARIOS[2];
    expect(() =>
      validateScenario(
        {
          ...scenario,
          contentStatus: { state: "verified", reviewedAt: "2026-10-17", reviewedBy: "Someone" },
        },
        { rules: UA_PDR_REFERENCES },
      ),
    ).toThrow();
  });
  it("checks visible vehicle, signal, sign and route poses while exposing unproven conditions", () => {
    for (const scenario of EDUCATIONAL_DEMO_SCENARIOS) {
      const scene = scenario.sceneReference?.scene;
      const situation = scenario.trafficDecision?.situation;
      if (!scene || !situation) throw new Error("missing fixture");
      const findings = assessSceneConsistency(scene, situation);
      expect(findings.filter((item) => item.status === "conflict")).toEqual([]);
      expect(findings.filter((item) => item.status === "confirmed")).toHaveLength(
        situation.vehicles.length + situation.signals.length + situation.signs.length,
      );
      expect(
        findings.some((item) => item.subject === "active-users" && item.status === "unconfirmed"),
      ).toBe(true);
      expect(
        findings.some((item) => item.subject === "semantic-link" && item.status === "unconfirmed"),
      ).toBe(true);
    }
  });
  it("rejects a moved vehicle, reversed sign, or incompatible exit trajectory", () => {
    const original = EDUCATIONAL_DEMO_SCENARIOS[2];
    const context = { rules: UA_PDR_REFERENCES };
    const changed = structuredClone(original);
    const scene = changed.sceneReference?.scene;
    if (!scene) throw new Error("missing fixture");
    const sedan = scene.objects.find((object) => object.instanceId === "vehicle-sedan");
    if (!sedan) throw new Error("missing vehicle");
    sedan.transform.position = [2.4, 0, -12];
    expect(() => validateScenario(changed, context)).toThrow(/vehicle:secondary/);
    sedan.transform.position = [2.4, 0, 12];
    const sign = scene.objects.find((object) => object.instanceId === "sign-yield-s");
    if (!sign) throw new Error("missing sign");
    sign.transform.rotation = [0, Math.PI, 0];
    expect(() => validateScenario(changed, context)).toThrow(/sign:yield-south/);
    sign.transform.rotation = [0, 0, 0];
    const path = changed.trafficDecision?.situation.trajectories[0];
    if (!path) throw new Error("missing path");
    path.points[1] = [12, 0];
    expect(() => validateScenario(changed, context)).toThrow(/vehicle:secondary/);
  });
  it("maps a west approach turning left to the northern exit", () => {
    const scenario = EDUCATIONAL_DEMO_SCENARIOS[2];
    const scene = scenario.sceneReference?.scene;
    const original = scenario.trafficDecision?.situation;
    if (!scene || !original) throw new Error("missing fixture");
    const situation = structuredClone(original);
    const main = situation.vehicles.find((vehicle) => vehicle.id === "main");
    const path = situation.trajectories.find((entry) => entry.vehicleId === "main");
    if (!main || !path) throw new Error("missing participant");
    main.intendedManeuver = "left";
    path.points = [
      [-13, 2.4],
      [0, 2.4],
      [0, -12],
    ];
    expect(
      assessSceneConsistency(scene, situation).find((item) => item.subject === "vehicle:main")
        ?.status,
    ).toBe("confirmed");
    path.points[2] = [0, 12];
    expect(
      assessSceneConsistency(scene, situation).find((item) => item.subject === "vehicle:main")
        ?.status,
    ).toBe("conflict");
  });
});
