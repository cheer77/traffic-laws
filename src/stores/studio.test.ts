import { beforeEach,describe,expect,it } from "vitest";
import { useStudioStore } from "./useStudioStore";
import { VEHICLES } from "@/lib/studioConfig";
import { geometry } from "@/components/scene/resources";

beforeEach(()=>useStudioStore.getState().reset());

describe("studio state workflows",()=>{
 it("reveals a hidden asset when selected and cancels the previous model's light preview",()=>{
  const studio=useStudioStore.getState();
  studio.toggleVehicle("fire");studio.setSignal("hazard");studio.toggle("beacon");studio.toggle("wheelPreview");
  studio.select("fire");
  const selected=useStudioStore.getState();
  expect(selected.visible.fire).toBe(true);expect(selected.active).toBe("fire");expect(selected.camera).toBe("focus");
  expect(selected.signal).toBe("off");expect(selected.beacon).toBe(false);expect(selected.wheelPreview).toBe(false);
 });
 it("keeps independent layer and vehicle visibility and restores the complete scene on reset",()=>{
  const studio=useStudioStore.getState();
  studio.toggleLayer("buildings");studio.toggleLayer("characters");studio.toggleVehicle("sedan");studio.setQuality("low");studio.setSun(.6);
  expect(useStudioStore.getState().layers.trees).toBe(true);
  expect(useStudioStore.getState().visible.police).toBe(true);
  studio.reset();
  const reset=useStudioStore.getState();
  expect(Object.values(reset.visible).every(Boolean)).toBe(true);expect(Object.values(reset.layers).every(Boolean)).toBe(true);
  expect(reset.quality).toBe("medium");expect(reset.sun).toBe(1.8);
 });
 it("can focus the active model again after hiding it",()=>{
  const studio=useStudioStore.getState();studio.toggleVehicle("sedan");
  const before=useStudioStore.getState().cameraRevision;studio.setCamera("focus");
  expect(useStudioStore.getState().visible.sedan).toBe(true);expect(useStudioStore.getState().cameraRevision).toBeGreaterThan(before);
 });
});

describe("procedural assets",()=>{
 it("contains six distinct, separated placements",()=>{
  expect(VEHICLES).toHaveLength(6);expect(new Set(VEHICLES.map(asset=>asset.id)).size).toBe(6);
  for(let i=0;i<VEHICLES.length;i++)for(let j=i+1;j<VEHICLES.length;j++){
   const a=VEHICLES[i],b=VEHICLES[j];
   expect(Math.hypot(a.position[0]-b.position[0],a.position[2]-b.position[2])).toBeGreaterThan((a.length+b.length)/2);
  }
 });
 it.each(Object.entries(geometry))("%s has finite vertices and a bounded polygon count",(_,asset)=>{
  const positions=asset.getAttribute("position");
  expect(positions.count).toBeLessThan(15000);
  expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
  asset.computeBoundingBox();expect(asset.boundingBox?.isEmpty()).toBe(false);
 });
});
