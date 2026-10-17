import { describe, expect, it } from "vitest";
import { analyzeTrafficSituation } from "./traffic-rules-engine";
import { UA_PDR_REFERENCES } from "./ua-pdr-references";
import type { TrafficSituation } from "./traffic-situation";

function signalized(): TrafficSituation {
  return {
    schemaVersion: 1,
    id: "engine-test",
    country: "UA",
    intersection: {
      layout: "cross",
      control: "signals",
      regulator: "absent",
      pedestrians: "absent",
      otherRoadUsers: "absent",
      specialSignalSections: "absent",
      exitBlocked: "no",
    },
    lanes: [
      {
        id: "south",
        approach: "south",
        indexFromRight: 1,
        maneuverRestriction: "none",
        maneuverPermissions: [],
      },
      {
        id: "north",
        approach: "north",
        indexFromRight: 1,
        maneuverRestriction: "none",
        maneuverPermissions: [],
      },
    ],
    vehicles: [
      {
        id: "a",
        laneId: "south",
        intendedManeuver: "left",
        vehicleType: "non-rail",
        sceneInstanceId: null,
      },
      {
        id: "b",
        laneId: "north",
        intendedManeuver: "straight",
        vehicleType: "non-rail",
        sceneInstanceId: null,
      },
    ],
    signs: [],
    signals: [
      { id: "s", indication: "green", mode: "main", laneIds: ["south"], sceneInstanceId: null },
      { id: "n", indication: "green", mode: "main", laneIds: ["north"], sceneInstanceId: null },
    ],
    trajectories: [
      {
        id: "a-path",
        vehicleId: "a",
        points: [
          [2, 10],
          [2, 0],
          [-10, 0],
        ],
        sweptHalfWidthMeters: 1,
        occupancy: { enterMs: 0, exitMs: 1000 },
      },
      {
        id: "b-path",
        vehicleId: "b",
        points: [
          [-2, -10],
          [-2, 10],
        ],
        sweptHalfWidthMeters: 1,
        occupancy: { enterMs: 0, exitMs: 1000 },
      },
    ],
    conflicts: [{ firstTrajectoryId: "a-path", secondTrajectoryId: "b-path", kind: "crossing" }],
    simultaneousMovement: [{ trajectoryIds: ["a-path", "b-path"], assessment: "candidate" }],
  };
}
const reviewedFixture = UA_PDR_REFERENCES.map((rule) => ({
  ...rule,
  verification: {
    status: "verified" as const,
    checkedAt: "2026-10-17",
    checkedBy: "SYNTHETIC TEST FIXTURE ONLY",
    evidenceUrl: "https://example.org/test-fixture",
  },
}));

describe("bounded deterministic UA traffic evaluator", () => {
  it("keeps legal review separate from a technically complete left-turn relation", () => {
    const provisional = analyzeTrafficSituation(signalized(), UA_PDR_REFERENCES);
    expect(provisional.technicalCertainty).toBe("determinate");
    expect(provisional.certainty).toBe("unsupported");
    expect(provisional.normativeStatus).toBe("unverified");
    expect(provisional.yieldObligations).toEqual([
      {
        fromVehicleId: "a",
        toVehicleId: "b",
        ruleReferences: ["ua-pdr-16.6"],
        explanation: expect.any(String),
      },
    ]);
    expect(provisional.priorityRelations).toEqual([
      { higherVehicleId: "b", lowerVehicleId: "a", ruleReferences: ["ua-pdr-16.6"] },
    ]);
    expect(provisional.pathConflicts[0]).toMatchObject({
      centerlinesIntersect: true,
      sweptGeometry: "intersects",
      temporal: "possible-overlap",
    });
    expect(provisional.simultaneousMovement[0].status).toBe("blocked");
    expect(analyzeTrafficSituation(signalized(), reviewedFixture).certainty).toBe("determinate");
  });
  it("handles red, green and yellow distinctly, including the yellow exception", () => {
    const red = signalized();
    red.signals[0].indication = "red";
    const redResult = analyzeTrafficSituation(red, reviewedFixture);
    expect(redResult.maneuvers[0].status).toBe("prohibited");
    expect(redResult.maneuvers[1].status).toBe("allowed");
    expect(redResult.yieldObligations).toEqual([]);
    delete red.lanes[0].maneuverRestriction;
    expect(analyzeTrafficSituation(red, reviewedFixture).maneuvers[0].status).toBe("prohibited");
    const yellow = signalized();
    yellow.signals[0].indication = "yellow";
    const yellowResult = analyzeTrafficSituation(yellow, reviewedFixture);
    expect(yellowResult.maneuvers[0].status).toBe("unknown");
    expect(yellowResult.certainty).toBe("unsupported");
    expect(yellowResult.ruleReferences).toContain("ua-pdr-8.11");
  });
  it("uses the main/secondary relation without imposing a total order", () => {
    const situation = signalized();
    situation.signals.forEach((signal) => {
      signal.indication = "off";
    });
    situation.intersection.roadRelation = "main-secondary";
    situation.intersection.mainRoadTurns = "no";
    situation.lanes[0].roadPriority = "secondary";
    situation.lanes[1].roadPriority = "main";
    situation.signs = [
      {
        id: "give-way",
        kind: "give-way",
        officialCode: null,
        laneIds: ["south"],
        sceneInstanceId: null,
      },
      {
        id: "main",
        kind: "priority",
        officialCode: null,
        laneIds: ["north"],
        sceneInstanceId: null,
      },
    ];
    const result = analyzeTrafficSituation(situation, reviewedFixture);
    expect(result.certainty).toBe("determinate");
    expect(result.yieldObligations.map((edge) => [edge.fromVehicleId, edge.toVehicleId])).toEqual([
      ["a", "b"],
    ]);
    situation.vehicles[0].intendedManeuver = "right";
    situation.trajectories[0].points = [
      [2, 10],
      [2, 0],
      [10, 0],
    ];
    situation.conflicts = [];
    const parallel = analyzeTrafficSituation(situation, reviewedFixture);
    expect(parallel.yieldObligations).toHaveLength(1);
    expect(parallel.simultaneousMovement[0].status).toBe("possible");
    situation.intersection.mainRoadTurns = "yes";
    expect(analyzeTrafficSituation(situation, reviewedFixture).certainty).toBe("unsupported");
  });
  it("applies right-hand priority only to explicitly equal non-rail roads", () => {
    const situation = signalized();
    situation.intersection.control = "uncontrolled";
    situation.intersection.roadRelation = "equal";
    situation.signals = [];
    situation.lanes[0].roadPriority = "equal";
    situation.lanes[1].approach = "east";
    situation.lanes[1].roadPriority = "equal";
    const result = analyzeTrafficSituation(situation, reviewedFixture);
    expect(result.yieldObligations.map((edge) => [edge.fromVehicleId, edge.toVehicleId])).toEqual([
      ["a", "b"],
    ]);
    situation.vehicles[1].vehicleType = "tram";
    expect(analyzeTrafficSituation(situation, reviewedFixture).certainty).toBe("unsupported");
  });
  it("can identify simultaneous candidates from known clearance and overlapping time", () => {
    const situation = signalized();
    situation.vehicles[0].intendedManeuver = "straight";
    situation.trajectories[0].points = [
      [-8, 0],
      [-8, 10],
    ];
    situation.trajectories[1].points = [
      [8, 0],
      [8, 10],
    ];
    situation.conflicts = [];
    const result = analyzeTrafficSituation(situation, reviewedFixture);
    expect(result.certainty).toBe("determinate");
    expect(result.yieldObligations).toEqual([]);
    expect(result.pathConflicts[0].sweptGeometry).toBe("clear");
    expect(result.simultaneousMovement[0].status).toBe("possible");
    situation.trajectories[1].occupancy = { enterMs: 1000, exitMs: 2000 };
    expect(analyzeTrafficSituation(situation, reviewedFixture).simultaneousMovement[0].status).toBe(
      "blocked",
    );
  });
  it("distinguishes centerline crossing from width and temporal conflict", () => {
    const situation = signalized();
    situation.trajectories[1].occupancy = { enterMs: 1000, exitMs: 2000 };
    expect(analyzeTrafficSituation(situation, reviewedFixture).pathConflicts[0].temporal).toBe(
      "separated",
    );
    delete situation.trajectories[0].sweptHalfWidthMeters;
    const unknown = analyzeTrafficSituation(situation, reviewedFixture);
    expect(unknown.pathConflicts[0].centerlinesIntersect).toBe(true);
    expect(unknown.pathConflicts[0].sweptGeometry).toBe("unknown");
    expect(unknown.certainty).toBe("insufficient_data");
  });
  it("reports missing and contradictory data instead of choosing a default", () => {
    const missing = signalized();
    delete missing.intersection.regulator;
    expect(analyzeTrafficSituation(missing, reviewedFixture).certainty).toBe("insufficient_data");
    const contradictory = signalized();
    contradictory.intersection.control = "uncontrolled";
    contradictory.intersection.roadRelation = "equal";
    contradictory.lanes.forEach((lane) => {
      lane.roadPriority = "equal";
    });
    expect(analyzeTrafficSituation(contradictory, reviewedFixture).certainty).toBe("ambiguous");
    const unsupported = signalized();
    unsupported.intersection.layout = "roundabout";
    expect(analyzeTrafficSituation(unsupported, reviewedFixture).certainty).toBe("unsupported");
  });
  it("does not treat missing signals as observed off signals", () => {
    const situation = signalized();
    situation.signals = [];
    situation.intersection.roadRelation = "main-secondary";
    situation.intersection.mainRoadTurns = "no";
    situation.lanes[0].roadPriority = "secondary";
    situation.lanes[1].roadPriority = "main";
    const result = analyzeTrafficSituation(situation, reviewedFixture);
    expect(result.certainty).toBe("insufficient_data");
    expect(result.maneuvers.every((entry) => entry.status === "unknown")).toBe(true);
    expect(result.yieldObligations).toEqual([]);
    expect(result.ruleReferences).not.toContain("ua-pdr-16.1");
  });
  it("does not apply unregulated priority under contradictory active control", () => {
    const situation = signalized();
    situation.intersection.control = "uncontrolled";
    situation.intersection.roadRelation = "equal";
    situation.lanes[0].roadPriority = "equal";
    situation.lanes[1].approach = "east";
    situation.lanes[1].roadPriority = "equal";
    const result = analyzeTrafficSituation(situation, reviewedFixture);
    expect(result.certainty).toBe("ambiguous");
    expect(result.maneuvers.every((entry) => entry.status === "unknown")).toBe(true);
    expect(result.yieldObligations).toEqual([]);
  });
  it("does not report concurrent movement possible when global evidence is unresolved", () => {
    const situation = signalized();
    situation.vehicles[0].intendedManeuver = "straight";
    situation.trajectories[0].points = [
      [-8, 0],
      [-8, 10],
    ];
    situation.trajectories[1].points = [
      [8, 0],
      [8, 10],
    ];
    situation.conflicts = [];
    expect(analyzeTrafficSituation(situation, reviewedFixture).simultaneousMovement[0].status).toBe(
      "possible",
    );
    expect(
      analyzeTrafficSituation(situation, UA_PDR_REFERENCES).simultaneousMovement[0].status,
    ).toBe("unknown");
    situation.intersection.layout = "roundabout";
    expect(analyzeTrafficSituation(situation, reviewedFixture).simultaneousMovement[0].status).toBe(
      "unknown",
    );
  });
  it("diagnoses contradictory road classes on one approach and unsupported STOP semantics", () => {
    const situation = signalized();
    situation.signals.forEach((signal) => {
      signal.indication = "off";
    });
    situation.intersection.roadRelation = "main-secondary";
    situation.intersection.mainRoadTurns = "no";
    situation.lanes[0].roadPriority = "secondary";
    situation.lanes[1].approach = "south";
    situation.lanes[1].roadPriority = "main";
    situation.signs = [
      { id: "stop", kind: "stop", officialCode: null, laneIds: ["south"], sceneInstanceId: null },
      {
        id: "main",
        kind: "priority",
        officialCode: null,
        laneIds: ["north"],
        sceneInstanceId: null,
      },
    ];
    const result = analyzeTrafficSituation(situation, reviewedFixture);
    expect(result.certainty).toBe("ambiguous");
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/суперечливий пріоритет/),
        expect.stringMatching(/STOP/),
      ]),
    );
  });
  it("rejects a forged source edition and does not report verified legal support", () => {
    const wrongEdition = reviewedFixture.map((rule) => ({
      ...rule,
      source: rule.source && { ...rule.source, editionDate: "2025-01-01" },
    }));
    const result = analyzeTrafficSituation(signalized(), wrongEdition);
    expect(result.certainty).toBe("unsupported");
    expect(result.diagnostics).toContain("Немає належного запису редакції для ua-pdr-16.6.");
  });
  it("keeps pairwise relations for three vehicles without inventing a total queue", () => {
    const situation = signalized();
    situation.lanes.push({
      id: "east",
      approach: "east",
      indexFromRight: 1,
      maneuverRestriction: "none",
      maneuverPermissions: [],
    });
    situation.vehicles.push({
      id: "c",
      laneId: "east",
      intendedManeuver: "right",
      vehicleType: "non-rail",
      sceneInstanceId: null,
    });
    situation.signals.push({
      id: "e",
      indication: "red",
      mode: "main",
      laneIds: ["east"],
      sceneInstanceId: null,
    });
    situation.trajectories.push({
      id: "c-path",
      vehicleId: "c",
      points: [
        [10, 2],
        [0, 2],
      ],
      sweptHalfWidthMeters: 1,
      occupancy: { enterMs: 0, exitMs: 1000 },
    });
    const result = analyzeTrafficSituation(situation, reviewedFixture);
    expect(result.maneuvers.map((entry) => entry.status)).toEqual([
      "allowed",
      "allowed",
      "prohibited",
    ]);
    expect(result.priorityRelations).toEqual([
      { higherVehicleId: "b", lowerVehicleId: "a", ruleReferences: ["ua-pdr-16.6"] },
    ]);
    expect(result.pathConflicts).toHaveLength(3);
  });
  it("covers oncoming right turn and refuses an unmodeled opposite-direction rule", () => {
    const situation = signalized();
    situation.vehicles[1].intendedManeuver = "right";
    expect(
      analyzeTrafficSituation(situation, reviewedFixture).yieldObligations[0].ruleReferences,
    ).toEqual(["ua-pdr-16.6"]);
    situation.vehicles[0].intendedManeuver = "straight";
    expect(analyzeTrafficSituation(situation, reviewedFixture).certainty).toBe("unsupported");
    situation.intersection.control = "uncontrolled";
    situation.intersection.roadRelation = "equal";
    situation.signals = [];
    situation.lanes.forEach((lane) => {
      lane.roadPriority = "equal";
    });
    situation.vehicles[0].intendedManeuver = "left";
    expect(
      analyzeTrafficSituation(situation, reviewedFixture).diagnostics.some((message) =>
        message.includes("16.13"),
      ),
    ).toBe(true);
  });
});
