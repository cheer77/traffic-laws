"use client";
import { MeshBasicMaterial, RingGeometry } from "three";
// Studio owns these bounded, module-lifetime helper caches; models remain owned by assets-3d.
const geometries = new Map<number, RingGeometry>();
const material = new MeshBasicMaterial({ color: "#c5a16a", transparent: true, opacity: 0.85 });
export function SelectionRing({ radius }: { radius: 1.35 | 2.55 | 3 | 3.5 }) {
  let geometry = geometries.get(radius);
  if (!geometry) {
    geometry = new RingGeometry(radius, radius + 0.04, 64);
    geometries.set(radius, geometry);
  }
  return (
    <mesh
      userData={{ helper: true }}
      rotation-x={-Math.PI / 2}
      position-y={0.025}
      geometry={geometry}
      material={material}
      dispose={null}
    />
  );
}
