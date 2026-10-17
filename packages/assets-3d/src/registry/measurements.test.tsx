import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { create } from "@react-three/test-renderer";
import { Box3, InstancedMesh, Mesh, Vector3, type Object3D } from "three";
import { writeFileSync } from "node:fs";
import { ASSET_MODELS } from "./models";
import measurements from "./measurements.json";

function isMesh(object: Object3D): object is Mesh {
  return "isMesh" in object && object.isMesh === true;
}
function isInstanced(object: Mesh): object is InstancedMesh {
  return "isInstancedMesh" in object && object.isInstancedMesh === true;
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("self", { requestAnimationFrame: () => 0, cancelAnimationFrame: () => {} });
});
afterEach(() => vi.unstubAllGlobals());

it("measures every public asset independently and detects geometry drift", async () => {
  const result: Record<string, unknown> = {};
  for (const [id, Model] of Object.entries(ASSET_MODELS)) {
    const renderer = await create(<Model />);
    try {
      const root = renderer.scene.instance;
      root.updateMatrixWorld(true);
      let meshes = 0,
        triangles = 0,
        instancedMeshes = 0;
      root.traverse((object) => {
        if (!isMesh(object)) return;
        meshes++;
        const count = isInstanced(object) ? object.count : 1;
        if (isInstanced(object)) {
          instancedMeshes++;
          object.computeBoundingBox();
        }
        triangles +=
          ((object.geometry.index?.count ?? object.geometry.getAttribute("position").count) / 3) *
          count;
      });
      const box = new Box3().setFromObject(root),
        size = box.getSize(new Vector3());
      const round = (values: number[]) => values.map((value) => Math.round(value * 1e6) / 1e6 || 0);
      result[id] = {
        dimensions: round(size.toArray()),
        boundingBox: { min: round(box.min.toArray()), max: round(box.max.toArray()) },
        performanceMetadata: {
          meshes,
          triangles,
          instancedMeshes,
          drawCalls: null,
          fps: null,
          frameTimeMs: null,
          method: "R3F scene graph; all geometry including hidden lamps; no GPU measurement",
        },
      };
      expect(meshes).toBeGreaterThan(0);
      expect(size.toArray().every((value) => Number.isFinite(value) && value > 0)).toBe(true);
    } finally {
      await renderer.unmount();
    }
  }
  if (process.env.UPDATE_ASSET_MEASUREMENTS === "1")
    writeFileSync(
      new URL("./measurements.json", import.meta.url),
      JSON.stringify(result, null, 2) + "\n",
    );
  else expect(result).toEqual(measurements);
});
