import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { act,create,type ReactThreeTest } from "@react-three/test-renderer";
import * as THREE from "three";
import { SCENE_ASSETS } from "@/lib/sceneAssets";
import { inspectObject } from "@/lib/objectInspection";
import { useStudioStore } from "@/stores/useStudioStore";
import { SceneObjects } from "./SceneObjects";
import { SceneDebug } from "../debug/SceneDebug";
import { RenderMonitor } from "../debug/RenderMonitor";
import { signalFor } from "./traffic-lights/TrafficLights";

let renderer:ReactThreeTest.Renderer|undefined;
beforeEach(()=>{vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);vi.stubGlobal("self",{requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{}});useStudioStore.getState().reset()});
afterEach(async()=>{await renderer?.unmount();renderer=undefined;vi.restoreAllMocks();vi.useRealTimers();vi.unstubAllGlobals()});

describe("asset inspection workflows",()=>{
 it("isolates each registered asset, reusing its geometry, and restores the city",async()=>{
  renderer=await create(<SceneObjects/>);
  const original=renderer.scene.instance.getObjectByName("body-sedan")!.children[0] as THREE.Mesh;
  await act(async()=>useStudioStore.getState().setPreview(true));
  const preview=renderer.scene.instance.getObjectByName("body-sedan")!.children[0] as THREE.Mesh;
  expect(preview.geometry).toBe(original.geometry);
  for(const asset of SCENE_ASSETS){
   await act(async()=>useStudioStore.getState().selectObject(asset.id));
   const selected:THREE.Object3D[]=[];
   renderer.scene.instance.traverse(o=>{if(o.userData.inspectable)selected.push(o)});
   expect(selected.map(o=>o.name)).toEqual([asset.id]);
   expect(selected[0].position.toArray()).toEqual([0,0,0]);
   const info=inspectObject(selected[0]);expect(info.triangles).toBeGreaterThan(0);expect(info.size.every(Number.isFinite)).toBe(true);
  }
  await act(async()=>useStudioStore.getState().setPreview(false));
  expect(renderer.scene.instance.getObjectByName("city-scene")).toBeDefined();
  expect(renderer.scene.instance.getObjectByName("vehicle-fire")).toBeDefined();
 });
 it("counts transformed instances and excludes decorative selection helpers",()=>{
  const root=new THREE.Group();root.name="test";root.position.set(10,0,0);
  const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshBasicMaterial();
  const mesh=new THREE.InstancedMesh(geometry,material,2);mesh.setMatrixAt(0,new THREE.Matrix4());mesh.setMatrixAt(1,new THREE.Matrix4().makeTranslation(4,0,0));root.add(mesh);
  const helper=new THREE.Mesh(geometry,material);helper.position.y=50;helper.userData.helper=true;root.add(helper);
  const info=inspectObject(root);expect(info.triangles).toBe(24);expect(info.min).toEqual([9.5,-.5,-.5]);expect(info.max).toEqual([14.5,.5,.5]);
  mesh.dispose();geometry.dispose();material.dispose();
 });
 it("restores original materials and releases wireframe copies and helpers",async()=>{
  renderer=await create(<><SceneObjects/><SceneDebug/></>);
  const mesh=renderer.scene.instance.getObjectByName("body-sedan")!.children[0] as THREE.Mesh;
  const original=mesh.material;
  await act(async()=>{useStudioStore.getState().toggleDebug("wireframe");useStudioStore.getState().toggleDebug("bounds")});
  const clone=mesh.material as THREE.MeshStandardMaterial,dispose=vi.spyOn(clone,"dispose");
  expect(clone).not.toBe(original);expect(clone.wireframe).toBe(true);
  expect(useStudioStore.getState().inspection?.id).toBe("vehicle-sedan");
  await act(async()=>{useStudioStore.getState().toggleDebug("wireframe");useStudioStore.getState().toggleDebug("bounds")});
  expect(mesh.material).toBe(original);expect(dispose).toHaveBeenCalledOnce();
  expect(renderer.scene.instance.getObjectByName("debug-helpers")?.children).toHaveLength(0);
 });
 it("reveals the selected pedestrian layer and resets every debug default",()=>{
  const s=useStudioStore.getState();s.toggleLayer("characters");s.selectObject("person-senior");
  expect(useStudioStore.getState().layers.characters).toBe(true);expect(useStudioStore.getState().camera).toBe("focus");
  s.setPreview(true);s.setFrameLimit(30);s.setLighting("evening");s.toggleDebug("axes");s.reset();
  expect(useStudioStore.getState().preview).toBe(false);expect(Object.values(useStudioStore.getState().debug).some(Boolean)).toBe(false);
  expect(useStudioStore.getState().frameLimit).toBe(60);
 });
 it.each(["red","yellow","green","off"] as const)("switches all four test lights to %s",mode=>{
  expect([0,1,2,3].map(i=>signalFor(i,mode))).toEqual([mode,mode,mode,mode]);
 });
});

describe("render scheduling",()=>{
 it.each([30,60] as const)("caps actual draws at %i FPS and cancels work when inactive",async limit=>{
  vi.useFakeTimers();let now=1000;vi.spyOn(performance,"now").mockImplementation(()=>now);
  useStudioStore.getState().setFrameLimit(limit);
  const render=vi.fn();renderer=await create(<RenderMonitor/>,{onCreated:state=>{state.gl.render=render}});
  for(let i=0;i<120;i++){now=1000+i*1000/120;await renderer.advanceFrames(1,1/120)}
  expect(render.mock.calls.length).toBeGreaterThanOrEqual(limit-1);expect(render.mock.calls.length).toBeLessThanOrEqual(limit+1);
  await renderer.update(<RenderMonitor active={false}/>);
  const before=render.mock.calls.length;
  await renderer.advanceFrames(3,1/30);expect(render).toHaveBeenCalledTimes(before);
  await renderer.unmount();renderer=undefined;
  expect(vi.getTimerCount()).toBe(0);
 });
});
