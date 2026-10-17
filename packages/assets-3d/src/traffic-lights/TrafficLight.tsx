import { Ball } from "../Primitives";
import { AssetBuilder } from "../vehicles/assetBuilder";
import { AssetParts } from "../AssetParts";
import * as THREE from "three";
const builder = new AssetBuilder();
builder.bar("dark", [0, 0.16, 0], [0, 4.38, 0], 0.055);
builder.box("dark", [0, 0.23, 0], [0.25, 0.13, 0.25], undefined, true);
builder.box("dark", [0, 3.6, 0.08], [0.56, 1.48, 0.38], undefined, true);
for (const y of [3.08, 4.12]) builder.box("chrome", [0, y, -0.03], [0.17, 0.09, 0.23]);
for (const y of [3.2, 3.6, 4]) {
  // Open cylindrical hood, rather than a flat floating visor.
  const hood = new THREE.CylinderGeometry(0.18, 0.18, 0.16, 12, 1, true, Math.PI * 0.5, Math.PI);
  hood.rotateX(Math.PI / 2);
  hood.translate(0, y, 0.34);
  builder.add("dark", hood);
}
const parts = builder.finish();
export function TrafficLight({ signal = "off" }: { signal?: "red" | "yellow" | "green" | "off" }) {
  return (
    <>
      <AssetParts parts={parts} />
      {(["red", "yellow", "green"] as const).map((color, i) => (
        <group key={color} position={[0, 4 - i * 0.4, 0.282]}>
          <Ball
            scale={[0.145, 0.145, 0.035]}
            mat={
              signal === color
                ? color === "red"
                  ? "trafficRed"
                  : color === "yellow"
                    ? "trafficAmber"
                    : "trafficGreen"
                : "black"
            }
          />
        </group>
      ))}
    </>
  );
}
