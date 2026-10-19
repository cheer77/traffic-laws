import type { Direction } from "@traffic-laws/country-rules/traffic-situation";
import { ROAD } from "@traffic-laws/assets-3d/roads/roadGeometry";

export type Maneuver = "straight" | "left" | "right";
export interface MotionPlan {
  approach: Direction;
  maneuver: Maneuver;
  release: number;
  startDistance?: number;
  stopDistance?: number;
  initialDistance?: number;
}
export interface Pose {
  x: number;
  z: number;
  yaw: number;
}
export const STOP_CENTER = ROAD.stopDistance + 2.8;
export const DRIVE_SECONDS = 12;
export const APPROACH_SECONDS = 3;
const LANE = ROAD.laneWidth / 2;
const EDGE = ROAD.conflictHalfExtent;
const ROTATION: Record<Direction, number> = {
  south: 0,
  east: Math.PI / 2,
  north: Math.PI,
  west: -Math.PI / 2,
};
const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
export function routeLength(maneuver: Maneuver): number {
  return maneuver === "straight"
    ? STOP_CENTER + 30
    : STOP_CENTER -
        EDGE +
        ((maneuver === "left" ? EDGE + LANE : EDGE - LANE) * Math.PI) / 2 +
        30 -
        EDGE;
}
/** Analytic straight/quarter-circle/straight path. Tangents agree at both joins. */
export function routePose(plan: MotionPlan, distance: number, out: Pose): Pose {
  let x = LANE,
    z = STOP_CENTER - distance,
    heading = Math.PI;
  if (plan.maneuver !== "straight" && distance > STOP_CENTER - EDGE) {
    const left = plan.maneuver === "left";
    const radius = left ? EDGE + LANE : EDGE - LANE;
    const along = distance - (STOP_CENTER - EDGE);
    const angle = Math.min(Math.PI / 2, along / radius);
    const tail = Math.max(0, along - (radius * Math.PI) / 2);
    x = left ? -EDGE + radius * Math.cos(angle) - tail : EDGE - radius * Math.cos(angle) + tail;
    z = EDGE - radius * Math.sin(angle);
    heading = Math.PI + (left ? angle : -angle);
  }
  const rotation = ROTATION[plan.approach],
    c = Math.cos(rotation),
    s = Math.sin(rotation);
  out.x = x * c + z * s;
  out.z = -x * s + z * c;
  out.yaw = heading + rotation;
  return out;
}
/** All poses depend only on scenario time; frame rate and playback speed cannot alter paths. */
export function sampleMotion(
  plan: MotionPlan,
  time: number,
  out: Pose = { x: 0, z: 0, yaw: 0 },
): Pose {
  const start = plan.startDistance;
  const stagedStop = plan.stopDistance;
  const initialDistance = plan.initialDistance ?? -(20 - STOP_CENTER);
  const distance =
    start !== undefined
      ? start + (routeLength(plan.maneuver) - start) * smooth((time - plan.release) / DRIVE_SECONDS)
      : stagedStop !== undefined
        ? time < APPROACH_SECONDS
          ? initialDistance + (stagedStop - initialDistance) * smooth(time / APPROACH_SECONDS)
          : stagedStop +
            (routeLength(plan.maneuver) - stagedStop) *
              smooth((time - plan.release) / DRIVE_SECONDS)
        : time < APPROACH_SECONDS
          ? initialDistance * (1 - smooth(time / APPROACH_SECONDS))
          : routeLength(plan.maneuver) * smooth((time - plan.release) / DRIVE_SECONDS);
  return routePose(plan, distance, out);
}
export interface Playback {
  time: number;
  running: boolean;
  speed: number;
}
export function advancePlayback(state: Playback, delta: number, duration: number): void {
  if (!state.running) return;
  // A background-tab gap pauses physical time instead of jumping across the intersection.
  state.time = Math.min(duration, state.time + Math.min(Math.max(delta, 0), 0.1) * state.speed);
  if (state.time >= duration) state.running = false;
}
