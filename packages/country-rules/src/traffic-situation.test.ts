import { describe, expect, it } from "vitest";
import { validateTrafficSituation } from "./traffic-situation";
import { UA_PDR_REFERENCES } from "./ua-pdr-references";

const situation = {
  schemaVersion: 1,
  id: "test-cross",
  country: "UA",
  intersection: { layout: "cross", control: "signals" },
  lanes: [
    {
      id: "south",
      approach: "south",
      indexFromRight: 1,
      maneuverPermissions: [{ maneuver: "left", status: "unknown", ruleReferences: [] }],
    },
    {
      id: "north",
      approach: "north",
      indexFromRight: 1,
      maneuverPermissions: [{ maneuver: "straight", status: "unknown", ruleReferences: [] }],
    },
  ],
  vehicles: [
    { id: "a", laneId: "south", intendedManeuver: "left", sceneInstanceId: "vehicle-sedan" },
    { id: "b", laneId: "north", intendedManeuver: "straight", sceneInstanceId: null },
  ],
  signs: [],
  signals: [
    { id: "signal-s", indication: "green", laneIds: ["south"], sceneInstanceId: "light-s" },
  ],
  trajectories: [
    {
      id: "path-a",
      vehicleId: "a",
      points: [
        [0, 0],
        [1, 1],
      ],
    },
    {
      id: "path-b",
      vehicleId: "b",
      points: [
        [1, 0],
        [0, 1],
      ],
    },
  ],
  conflicts: [{ firstTrajectoryId: "path-a", secondTrajectoryId: "path-b", kind: "crossing" }],
  simultaneousMovement: [{ trajectoryIds: ["path-a", "path-b"], assessment: "undetermined" }],
};

describe("semantic traffic situation", () => {
  it("reconstructs a scenario independent of rendering and legal decisions", () => {
    expect(validateTrafficSituation(situation)).toEqual(situation);
  });
  it("rejects unknown schema fields, versions, duplicate IDs and broken references", () => {
    expect(() => validateTrafficSituation({ ...situation, schemaVersion: 2 })).toThrow(
      /schemaVersion/,
    );
    expect(() => validateTrafficSituation({ ...situation, camera: {} })).toThrow(/невідоме поле/);
    expect(() =>
      validateTrafficSituation({ ...situation, lanes: [situation.lanes[0], situation.lanes[0]] }),
    ).toThrow(/повторний ID/);
    expect(() =>
      validateTrafficSituation({
        ...situation,
        vehicles: [{ ...situation.vehicles[0], laneId: "missing" }],
      }),
    ).toThrow(/невідомий ID/);
    expect(() =>
      validateTrafficSituation({
        ...situation,
        conflicts: [{ ...situation.conflicts[0], secondTrajectoryId: "missing" }],
      }),
    ).toThrow(/невідомий ID/);
  });
  it("does not treat a candidate simultaneous group as a legal permission", () => {
    const parsed = validateTrafficSituation(situation);
    expect(parsed.simultaneousMovement[0].assessment).toBe("undetermined");
    expect(() =>
      validateTrafficSituation({
        ...situation,
        simultaneousMovement: [{ trajectoryIds: ["path-a", "path-b"], assessment: "allowed" }],
      }),
    ).toThrow(/невідоме значення/);
  });
  it("requires resolved, human-verified rules for authored maneuver permission", () => {
    const changedLane = {
      ...situation.lanes[0],
      maneuverPermissions: [
        { maneuver: "left", status: "allowed", ruleReferences: ["ua-pdr-16.6"] },
      ],
    };
    expect(() =>
      validateTrafficSituation(
        { ...situation, lanes: [changedLane, situation.lanes[1]] },
        UA_PDR_REFERENCES,
      ),
    ).toThrow(/перевірених правил/);
    expect(() =>
      validateTrafficSituation(
        {
          ...situation,
          lanes: [
            {
              ...changedLane,
              maneuverPermissions: [
                {
                  ...changedLane.maneuverPermissions[0],
                  status: "unknown",
                  ruleReferences: ["missing"],
                },
              ],
            },
            situation.lanes[1],
          ],
        },
        UA_PDR_REFERENCES,
      ),
    ).toThrow(/невідоме правило/);
  });
});
