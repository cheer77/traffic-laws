import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { create } from "@react-three/test-renderer";
import { Box3, Vector3 } from "three";
import { ASSET_REGISTRY } from "@traffic-laws/assets-3d/registry";
import { VEHICLE_GEOMETRY as sharedVehicles } from "@traffic-laws/assets-3d/vehicles/vehicleAssets";
import { material as sharedMaterials } from "@traffic-laws/assets-3d/resources";
import { VEHICLE_GEOMETRY } from "./vehicles/vehicleAssets";
import { material } from "./resources";
import { STUDIO_ASSET_IDS } from "@/lib/assetLibrary";
import { useStudioStore } from "@/stores/useStudioStore";
import { SceneObjects } from "./SceneObjects";

beforeEach(()=>{vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);vi.stubGlobal("self",{requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{}});useStudioStore.getState().reset()});
afterEach(()=>vi.unstubAllGlobals());
it("reuses the same resource objects through Studio compatibility exports",()=>{
 expect(VEHICLE_GEOMETRY).toBe(sharedVehicles);
 expect(material).toBe(sharedMaterials);
});
it.each(ASSET_REGISTRY)("opens $id in the existing Studio preview at its original scale",async asset=>{
 useStudioStore.getState().selectObject(STUDIO_ASSET_IDS[asset.id]);
 useStudioStore.getState().setPreview(true);
 const renderer=await create(<SceneObjects/>);
 try {
  renderer.scene.instance.updateMatrixWorld(true);
  const bounds=new Box3().setFromObject(renderer.scene.instance);
  bounds.getSize(new Vector3()).toArray().forEach((size,index)=>expect(size).toBeCloseTo(asset.dimensions[index],5));
 } finally {await renderer.unmount();}
});
