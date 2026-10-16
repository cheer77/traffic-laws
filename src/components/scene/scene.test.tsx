import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { create,act,type ReactThreeTest } from "@react-three/test-renderer";
import * as THREE from "three";
import { VEHICLES } from "@/lib/studioConfig";
import { BUILDINGS, CHARACTERS, LIGHTS, SIGNS } from "@/lib/sceneAssets";
import { useStudioStore } from "@/stores/useStudioStore";
import { VehicleModel } from "./vehicles/VehicleModel";
import { StudioCamera } from "./camera/StudioCamera";
import { SceneObjects } from "./SceneObjects";
import { previewVehicles } from "../../../scripts/previewVehicles";

let renderer:ReactThreeTest.Renderer|undefined;
beforeEach(()=>{vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);vi.stubGlobal("self",{requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{}});useStudioStore.getState().reset()});
afterEach(async()=>{await renderer?.unmount();renderer=undefined;vi.unstubAllGlobals()});

describe("assembled R3F scene",()=>{
 it("mounts all assets with valid geometry and a bounded scene budget",async()=>{
  renderer=await create(<SceneObjects/>);
  const stats={meshes:0,triangles:0,instanced:0};
  renderer.scene.instance.traverse(object=>{
   const mesh=object as THREE.Mesh;
   if(!mesh.isMesh)return;
   const geometry=mesh.geometry;
   expect(geometry.getAttribute("position")).toBeDefined();
   const instanced=mesh as THREE.InstancedMesh;
   const count=instanced.isInstancedMesh?instanced.count:1;
   stats.meshes++;stats.triangles+=(geometry.index?geometry.index.count:geometry.getAttribute("position").count)/3*count;
   if(instanced.isInstancedMesh)stats.instanced++;
  });
  for(const asset of VEHICLES)expect(renderer.scene.findByProps({name:`vehicle-${asset.id}`})).toBeDefined();
  if(process.env.STUDIO_ASSET_REPORT==="1"){
   const models=VEHICLES.map(asset=>{
    const result={id:asset.id,meshes:0,triangles:0};
    renderer!.scene.findByProps({name:`vehicle-${asset.id}`}).instance.traverse(object=>{
     const mesh=object as THREE.Mesh;if(!mesh.isMesh)return;result.meshes++;
     result.triangles+=(mesh.geometry.index?.count??mesh.geometry.getAttribute("position").count)/3;
    });return result;
   });
   console.info("ASSET_REPORT",JSON.stringify({scene:stats,models}));
  }
  if(process.env.STUDIO_ASSET_PREVIEW==="1"){
   await previewVehicles(renderer.scene.instance,"/private/tmp/pdd-vehicle-preview.png");
   await previewVehicles(renderer.scene.instance,"/private/tmp/pdd-vehicle-preview-rear.png",true);
   await previewVehicles(renderer.scene.instance,"/private/tmp/pdd-characters-preview.png",false,CHARACTERS);
   await previewVehicles(renderer.scene.instance,"/private/tmp/pdd-buildings-preview.png",false,BUILDINGS);
   await previewVehicles(renderer.scene.instance,"/private/tmp/pdd-devices-preview.png",false,[...SIGNS,LIGHTS[0]]);
   await previewVehicles(renderer.scene.instance,"/private/tmp/pdd-city-preview.png",false,[{id:"city-scene",name:"Міське перехрестя",rotation:0},{id:"city-scene",name:"Міське перехрестя · зворотний ракурс",rotation:Math.PI}]);
  }
  expect(stats.meshes,JSON.stringify(stats)).toBeLessThan(330);expect(stats.triangles,JSON.stringify(stats)).toBeLessThan(65000);expect(stats.instanced).toBeGreaterThanOrEqual(7);
 });
 it("removes and restores real vehicle and environment nodes with panel state",async()=>{
  renderer=await create(<SceneObjects/>);
  await act(async()=>{const state=useStudioStore.getState();state.toggleVehicle("suv");state.toggleLayer("buildings");state.toggleLayer("characters")});
  expect(renderer.scene.findAllByProps({name:"vehicle-suv"})).toHaveLength(0);
  expect(renderer.scene.findAllByProps({name:"buildings"})).toHaveLength(0);
  expect(renderer.scene.findAllByProps({name:"characters"})).toHaveLength(0);
  expect(renderer.scene.findAllByProps({name:"vehicle-sedan"})).toHaveLength(1);
  await act(async()=>useStudioStore.getState().reset());
  expect(renderer.scene.findAllByProps({name:"buildings"})).toHaveLength(1);
  expect(renderer.scene.findAllByProps({name:"vehicle-suv"})).toHaveLength(1);
 });
 it("selects the model by a 3D click and animates only its requested signal side",async()=>{
  renderer=await create(<group>{VEHICLES.map(asset=><VehicleModel key={asset.id} asset={asset}/>)}</group>);
  await renderer.fireEvent(renderer.scene.findByProps({name:"vehicle-police"}),"click");
  expect(useStudioStore.getState().active).toBe("police");
  await act(async()=>useStudioStore.getState().setSignal("right"));
  await renderer.advanceFrames(2,.05);
  const lamps=renderer.scene.findByProps({name:"signals-police"}).instance.children;
  expect(lamps.filter(lamp=>lamp.visible)).toHaveLength(2);
  expect(lamps.filter(lamp=>lamp.visible).every(lamp=>lamp.position.x<0)).toBe(true);
  expect(renderer.scene.findByProps({name:"signals-sedan"}).instance.visible).toBe(false);
 });
 it("rotates wheels only while preview is enabled",async()=>{
  renderer=await create(<VehicleModel asset={VEHICLES[0]}/>);
  const wheel=renderer.scene.findByProps({name:"wheels-sedan"}).instance.children[0];
  await renderer.advanceFrames(3,.05);expect(wheel.rotation.x).toBe(0);
  await act(async()=>useStudioStore.getState().toggle("wheelPreview"));
  await renderer.advanceFrames(3,.05);expect(wheel.rotation.x).toBeLessThan(0);
  const angle=wheel.rotation.x;
  await act(async()=>useStudioStore.getState().toggle("wheelPreview"));
  await renderer.advanceFrames(3,.05);expect(wheel.rotation.x).toBe(angle);
 });
 it("does not focus or select scenery after a camera drag; plain clicks only select",async()=>{
  renderer=await create(<SceneObjects/>);
  await act(async()=>useStudioStore.getState().setCamera("free"));
  for(const name of ["road","vehicle-police","building-home"]){
   const node=renderer.scene.findByProps({name});
   const previous=useStudioStore.getState().selectedId;
   await renderer.fireEvent(node,"click",{delta:45});
   expect(useStudioStore.getState().selectedId).toBe(previous);
   expect(useStudioStore.getState().camera).toBe("free");
   await renderer.fireEvent(node,"click",{delta:0});
   expect(useStudioStore.getState().selectedId).toBe(name);
   expect(useStudioStore.getState().camera).toBe("free");
  }
  await act(async()=>useStudioStore.getState().setCamera("focus"));
  expect(useStudioStore.getState().camera).toBe("focus");
 });
 it("free camera cancels a focus transition and keeps its pose when another object is clicked",async()=>{
  let camera:THREE.Camera|undefined;
  renderer=await create(<><SceneObjects/><StudioCamera enabled/></>,{
   onCreated:state=>{camera=state.camera},
   beforeReturn:canvas=>Object.defineProperty(canvas,"ownerDocument",{value:{addEventListener:()=>{},removeEventListener:()=>{}}}),
  });
  await act(async()=>renderer!.advanceFrames(180,1/60));
  await act(async()=>useStudioStore.getState().setCamera("focus"));
  await act(async()=>renderer!.advanceFrames(5,1/60));
  await act(async()=>useStudioStore.getState().setCamera("free"));
  const pose=camera!.position.clone();
  await renderer.fireEvent(renderer.scene.findByProps({name:"vehicle-fire"}),"click",{delta:0});
  await act(async()=>renderer!.advanceFrames(180,1/60));
  expect(camera!.position.distanceTo(pose)).toBeLessThan(.001);
  expect(useStudioStore.getState().camera).toBe("free");
  await act(async()=>useStudioStore.getState().setCamera("focus"));
  await act(async()=>renderer!.advanceFrames(180,1/60));
  expect(camera!.position.distanceTo(pose)).toBeGreaterThan(5);
 });
 it("moves the real scene camera between top, model focus, and isometric presets",async()=>{
  let camera:THREE.Camera|undefined;
  useStudioStore.getState().setCamera("top");
  renderer=await create(<StudioCamera enabled/>,{
   onCreated:state=>{camera=state.camera},
   beforeReturn:canvas=>Object.defineProperty(canvas,"ownerDocument",{value:{addEventListener:()=>{},removeEventListener:()=>{}}}),
  });
  await act(async()=>renderer!.advanceFrames(180,1/60));
  expect(camera!.position.y).toBeCloseTo(65,1);
  await act(async()=>useStudioStore.getState().select("fire"));
  await act(async()=>renderer!.advanceFrames(180,1/60));
  expect(camera!.position.distanceTo(new THREE.Vector3(...VEHICLES[5].position))).toBeLessThan(20);
  await act(async()=>useStudioStore.getState().setCamera("iso"));
  await act(async()=>renderer!.advanceFrames(180,1/60));
  expect(camera!.position.x).toBeCloseTo(32,1);expect(camera!.position.y).toBeCloseTo(28,1);
 });
});
