import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateScene } from "@traffic-laws/scene-engine";
import { advancePlayback, routeLength, routePose, sampleMotion, STOP_CENTER } from "./motion";
import { checkAnswer, AUTHORED_TRAINING_DRAFTS as TRAINING_SCENARIOS } from "./scenarios";
import { isReconstructedTicket, REFERENCE_CAMERAS } from "./ticket-reference-scene";

const EXPECTED_ANSWERS = [2, 3, 1, 2, 2, 2, 2, 1, 2, 2];
const WITH_3D = [1, 4, 5, 6, 8];

describe("retained authored Section 16.1 drafts (not school content)", () => {
  it("preserves the first ten answer-table entries and required 3D split", () => {
    expect(TRAINING_SCENARIOS).toHaveLength(10);
    expect(TRAINING_SCENARIOS.map((scenario) => (scenario.answer.correct ?? -1) + 1)).toEqual(
      EXPECTED_ANSWERS,
    );
    expect(
      TRAINING_SCENARIOS.filter((scenario) => scenario.scene).map(({ number }) => number),
    ).toEqual(WITH_3D);
    for (const scenario of TRAINING_SCENARIOS) {
      expect(checkAnswer(scenario, scenario.answer.correct)).toBe(true);
      expect(checkAnswer(scenario, null)).toBe(false);
    }
  });

  it("keeps every extracted original image byte-for-byte identifiable", () => {
    for (const scenario of TRAINING_SCENARIOS) {
      if (!scenario.image) throw new Error("Authored draft image missing");
      const file = new URL(`../../../public${scenario.image.src}`, import.meta.url);
      const digest = createHash("sha256").update(readFileSync(file)).digest("hex");
      expect(digest, scenario.id).toBe(scenario.image.sha256);
    }
  });

  it("validates ticket 1 as the compatibility scene before the remaining reconstructions", () => {
    const first = TRAINING_SCENARIOS[0].scene;
    expect(first).toBeDefined();
    expect(validateScene(first)).toEqual(first);
    expect(first?.objects.some(({ instanceId }) => instanceId === "car-white")).toBe(true);
  });

  it("validates the other four Studio-format Scene Definitions", () => {
    for (const number of [4, 5, 6, 8]) {
      const scene = TRAINING_SCENARIOS[number - 1].scene;
      expect(scene).toBeDefined();
      expect(validateScene(scene)).toEqual(scene);
      expect(scene?.objects[0].assetId).toBe("intersection.city.standard");
    }
  });

  it("uses a ticket-specific reference camera and authored object set for every reconstruction", () => {
    const expectedObjects = new Map([
      [1, ["light-s", "car-white", "queue-dark", "queue-a", "queue-b"]],
      [4, ["light-s", "light-n", "light-e", "light-w", "car-white", "waiting-gray"]],
      [5, ["light-s", "light-target", "car-white"]],
      [6, ["light-s", "light-target", "car-green"]],
      [8, ["light-s", "light-w", "car-red", "car-blue", "pedestrian-a", "pedestrian-b"]],
    ]);
    const cameraPositions = new Set<string>();
    for (const scenario of TRAINING_SCENARIOS.filter((entry) => entry.scene)) {
      expect(isReconstructedTicket(scenario.number)).toBe(true);
      if (!isReconstructedTicket(scenario.number)) continue;
      cameraPositions.add(REFERENCE_CAMERAS[scenario.number].position.join(","));
      expect(scenario.scene?.objects.slice(1).map(({ instanceId }) => instanceId)).toEqual(
        expectedObjects.get(scenario.number),
      );
    }
    expect(cameraPositions.size).toBe(5);
  });
});

describe("3D playback primitives", () => {
  it("stops at the authored internal stop line until the signal changes", () => {
    const car = TRAINING_SCENARIOS[4].cars[0];
    expect(sampleMotion(car, 3)).toEqual(sampleMotion(car, car.release));
    expect(sampleMotion(car, 0)).not.toEqual(sampleMotion(car, 3));
  });

  it("keeps turn paths tangent-continuous", () => {
    for (const maneuver of ["left", "right"] as const) {
      const plan = { approach: "south" as const, release: 4, maneuver };
      const radius = maneuver === "left" ? 7.2 : 2.4;
      for (const join of [STOP_CENTER - 4.8, STOP_CENTER - 4.8 + (radius * Math.PI) / 2]) {
        const before = routePose(plan, join - 0.0001, { x: 0, z: 0, yaw: 0 });
        const after = routePose(plan, join + 0.0001, { x: 0, z: 0, yaw: 0 });
        expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(0.00021);
        expect(Math.abs(after.yaw - before.yaw)).toBeLessThan(0.0001);
      }
      expect(routePose(plan, routeLength(maneuver), { x: 0, z: 0, yaw: 0 }).z).toBeCloseTo(
        maneuver === "left" ? -2.4 : 2.4,
      );
    }
  });

  it("pauses, changes speed, clamps background gaps, and ends", () => {
    const state = { time: 0, running: false, speed: 1 };
    advancePlayback(state, 0.1, 1);
    expect(state.time).toBe(0);
    state.running = true;
    state.speed = 2;
    advancePlayback(state, 0.1, 1);
    expect(state.time).toBeCloseTo(0.2);
    state.time = 0.99;
    state.speed = 1;
    advancePlayback(state, 30, 1);
    expect(state).toEqual({ time: 1, running: false, speed: 1 });
  });
});
