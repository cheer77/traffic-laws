import type { Pose, MotionPlan } from "./motion";
import { routeLength, routePose } from "./motion";

/** SVG y is world z. Three's Y-axis rotation is clockwise-negative in this plan view. */
export function diagramTransform(pose: Pose): string {
  return `translate(${pose.x} ${pose.z}) rotate(${(-pose.yaw * 180) / Math.PI})`;
}
export function diagramPath(plan: MotionPlan): string {
  const extent = Math.min(27, routeLength(plan.maneuver));
  return Array.from({ length: 65 }, (_, index) => {
    const pose = routePose(plan, (extent * index) / 64, { x: 0, z: 0, yaw: 0 });
    return `${index ? "L" : "M"}${pose.x},${pose.z}`;
  }).join(" ");
}
