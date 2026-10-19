import { describe, expect, it } from "vitest";
import { ROAD } from "@traffic-laws/assets-3d/roads/roadGeometry";
import {
  advancePlayback,
  routeLength,
  routePose,
  sampleMotion,
  STOP_CENTER,
  type Pose,
} from "./motion";
import { analysisOf, checkAnswer, durationOf, signalAt, TRAINING_SCENARIOS } from "./scenarios";

// Conservative oriented footprints include mirrors (2.5 × 5.1 m), larger than both assets.
function overlap(a: Pose, b: Pose): boolean {
  const axes = [a.yaw, a.yaw + Math.PI / 2, b.yaw, b.yaw + Math.PI / 2];
  return axes.every((angle) => {
    const x = Math.sin(angle),
      z = Math.cos(angle);
    const extent = (pose: Pose) =>
      2.55 * Math.abs(x * Math.sin(pose.yaw) + z * Math.cos(pose.yaw)) +
      1.25 * Math.abs(x * Math.cos(pose.yaw) - z * Math.sin(pose.yaw));
    return Math.abs((a.x - b.x) * x + (a.z - b.z) * z) < extent(a) + extent(b);
  });
}
describe("authored intersection plans", () => {
  for (const scenario of TRAINING_SCENARIOS) {
    it(`${scenario.id}: no footprint collisions at 100 Hz; no movement through a red stop line`, () => {
      const duration = durationOf(scenario);
      for (let step = 0; step <= duration * 100; step++) {
        const time = step / 100;
        const poses = scenario.cars.map((entry) => sampleMotion(entry, time));
        for (let i = 0; i < poses.length; i++) {
          for (let j = i + 1; j < poses.length; j++)
            expect(overlap(poses[i], poses[j]), `${scenario.id} collision at ${time}`).toBe(false);
          const entry = scenario.cars[i];
          const previous = sampleMotion(entry, Math.max(0, time - 0.01));
          expect(Math.hypot(poses[i].x - previous.x, poses[i].z - previous.z)).toBeLessThan(0.08);
          // Front bumper crossing the approach stop line must occur during green (or uncontrolled).
          const d =
            entry.approach === "south"
              ? poses[i].z
              : entry.approach === "north"
                ? -poses[i].z
                : entry.approach === "east"
                  ? poses[i].x
                  : -poses[i].x;
          if (d > ROAD.stopDistance + 2.4 && d < ROAD.stopDistance + 2.55 && time > 3)
            expect(["green", "off"]).toContain(signalAt(scenario, entry.approach, time));
        }
      }
      for (const entry of scenario.cars) {
        const waiting = sampleMotion(entry, 3);
        expect(sampleMotion(entry, entry.release)).toEqual(waiting);
        expect(Math.max(Math.abs(waiting.x), Math.abs(waiting.z))).toBeCloseTo(STOP_CENTER);
        const finish = sampleMotion(entry, duration);
        expect(Math.max(Math.abs(finish.x), Math.abs(finish.z))).toBeCloseTo(30);
        expect(sampleMotion(entry, 0)).toEqual(sampleMotion(entry, 0));
      }
    });
    it(`${scenario.id}: shared rules stay unverified; initial answers agree with supported analysis`, () => {
      const analysis = analysisOf(scenario);
      expect(analysis.normativeStatus).toBe("unverified");
      expect(analysis.technicalCertainty).toBe("determinate");
      if (scenario.answer.kind === "order") {
        expect(analysis.yieldObligations).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ fromVehicleId: "a", toVehicleId: "b" }),
          ]),
        );
        expect(checkAnswer(scenario, ["b", "a"], null)).toBe(true);
        expect(checkAnswer(scenario, ["a", "b"], null)).toBe(false);
        expect(checkAnswer(scenario, ["b"], null)).toBe(false);
      } else {
        expect(checkAnswer(scenario, [], scenario.answer.correct)).toBe(true);
        expect(checkAnswer(scenario, [], null)).toBe(false);
      }
    });
  }
  it("opposite traffic moves concurrently; side traffic waits through clearance", () => {
    const scenario = TRAINING_SCENARIOS[4];
    const [a, b] = scenario.cars.map((entry) => sampleMotion(entry, 10));
    expect(a.x).toBeCloseTo(-b.x);
    expect(a.z).toBeCloseTo(-b.z);
    expect(signalAt(scenario, "south", 16.5)).toBe("yellow");
    expect(signalAt(scenario, "east", 19)).toBe("red");
    expect(signalAt(scenario, "east", 20)).toBe("green");
    expect(analysisOf(scenario).simultaneousMovement).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: "unknown" })]),
    );
  });
  it("turn paths have continuous tangents and stay in the outbound lane", () => {
    for (const maneuver of ["left", "right"] as const) {
      const plan = { approach: "south" as const, release: 4, maneuver };
      const radius = maneuver === "left" ? 7.2 : 2.4;
      for (const join of [STOP_CENTER - 4.8, STOP_CENTER - 4.8 + (radius * Math.PI) / 2]) {
        const before = routePose(plan, join - 0.0001, { x: 0, z: 0, yaw: 0 });
        const after = routePose(plan, join + 0.0001, { x: 0, z: 0, yaw: 0 });
        expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(0.00021);
        expect(Math.abs(after.yaw - before.yaw)).toBeLessThan(0.0001);
      }
      const end = routePose(plan, routeLength(maneuver), { x: 0, z: 0, yaw: 0 });
      expect(end.z).toBeCloseTo(maneuver === "left" ? -2.4 : 2.4);
    }
  });
  it("playback pauses, changes speed, clamps background gaps, and ends", () => {
    const state = { time: 0, running: false, speed: 1 };
    advancePlayback(state, 0.1, 1);
    expect(state.time).toBe(0);
    state.running = true;
    for (const speed of [0.5, 1, 2]) {
      state.time = 0;
      state.speed = speed;
      advancePlayback(state, 0.1, 1);
      expect(state.time).toBeCloseTo(0.1 * speed);
    }
    state.time = 0;
    state.speed = 1;
    advancePlayback(state, 30, 1);
    expect(state.time).toBeCloseTo(0.1);
    state.time = 0.99;
    advancePlayback(state, 0.1, 1);
    expect(state).toEqual({ time: 1, running: false, speed: 1 });
  });
});
