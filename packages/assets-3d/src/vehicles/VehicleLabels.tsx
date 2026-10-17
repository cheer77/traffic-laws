"use client";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { VehicleKind } from "../types/assets";
import { quad } from "./assetBuilder";
import { VEHICLE_GEOMETRY } from "./vehicleAssets";
import { LABEL_ATLAS_SIZE, LABEL_ROWS } from "./labelLayout";

// Один атлас 512×256 для всех надписей: без загрузки шрифтов, SDF и дополнительных текстур.
const labelMaterial = new THREE.MeshBasicMaterial({
  transparent: true,
  alphaTest: 0.15,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
  toneMapped: false,
});
let atlas: THREE.CanvasTexture | undefined;

function ensureAtlas() {
  if (atlas || typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  [canvas.width, canvas.height] = LABEL_ATLAS_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, ...LABEL_ATLAS_SIZE);
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const [row, { text, width, color }] of LABEL_ROWS.entries()) {
    context.font = "700 52px Arial, sans-serif";
    context.fillStyle = color;
    context.save();
    context.translate(256, row * 64 + 33);
    context.scale((width - 16) / context.measureText(text).width, 1);
    context.fillText(text, 0, 0);
    context.restore();
  }
  atlas = new THREE.CanvasTexture(canvas);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 2;
  labelMaterial.map = atlas;
  labelMaterial.needsUpdate = true;
}

const labelGeometry = Object.fromEntries(
  Object.entries(VEHICLE_GEOMETRY).map(([id, asset]) => {
    if (!asset.labels.length) return [id, null];
    const patches = asset.labels.map((label) => {
      const width = LABEL_ROWS[label.row].width,
        u0 = (512 - width) / 1024,
        u1 = 1 - u0;
      return quad(label.face, [u0, 1 - (label.row + 1) / 4, u1, 1 - label.row / 4]);
    });
    const merged = mergeGeometries(patches);
    patches.forEach((patch) => patch.dispose());
    return [id, merged];
  }),
) as Record<VehicleKind, THREE.BufferGeometry | null>;

export function VehicleLabels({ kind }: { kind: VehicleKind }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    ensureAtlas();
    invalidate();
  }, [invalidate]);
  const geometry = labelGeometry[kind];
  return geometry ? (
    <mesh
      name={`labels-${kind}`}
      geometry={geometry}
      material={labelMaterial}
      renderOrder={1}
      dispose={null}
    />
  ) : null;
}
