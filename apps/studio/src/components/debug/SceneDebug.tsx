"use client";
import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useComposerStore } from "@/stores/useComposerStore";
import { useStudioStore } from "@/stores/useStudioStore";
import { inspectObject } from "@/lib/objectInspection";
import { APPROACHES, laneGeometry, lanePoint, ROAD } from "@/lib/roadGeometry";

export function SceneDebug(){
 const definition=useComposerStore(s=>s.scene);
 const scene=useThree(s=>s.scene),invalidate=useThree(s=>s.invalidate);
 const selected=useStudioStore(s=>s.selectedId),preview=useStudioStore(s=>s.preview),debug=useStudioStore(s=>s.debug);
 const layers=useStudioStore(s=>s.layers),visible=useStudioStore(s=>s.visible),headlights=useStudioStore(s=>s.headlights),wheels=useStudioStore(s=>s.wheelPreview);
 const lighting=useStudioStore(s=>s.lighting),quality=useStudioStore(s=>s.quality);
 useLayoutEffect(()=>{
  const root=scene.getObjectByName(selected);
  useStudioStore.getState().setInspection(root?inspectObject(root):null);
  const helpers=new THREE.Group();helpers.name="debug-helpers";helpers.userData.helper=true;
  const disposables:Array<{dispose:()=>void}>=[],restore:Array<()=>void>=[];
  if(debug.bounds)scene.traverse(object=>{
   if(!object.userData.inspectable)return;
   const info=inspectObject(object),box=new THREE.Box3(new THREE.Vector3(...info.min),new THREE.Vector3(...info.max));
   const helper=new THREE.Box3Helper(box,object===root?0xc5a16a:0x6e968a);helpers.add(helper);disposables.push(helper);
  });
  if(debug.axes){const axes=new THREE.AxesHelper(preview?3:8);helpers.add(axes);disposables.push(axes)}
  if(debug.lanes&&!preview){
   for(const approach of APPROACHES)for(const outbound of [false,true]){
    const start=new THREE.Vector3(...lanePoint(approach,ROAD.halfLength,outbound)),end=new THREE.Vector3(...lanePoint(approach,ROAD.conflictHalfExtent,outbound));
    start.y=end.y=.045;
    const geometry=new THREE.BufferGeometry().setFromPoints([start,end]),material=new THREE.LineBasicMaterial({color:outbound?0xc5a16a:0x437c99});
    helpers.add(new THREE.Line(geometry,material));disposables.push(geometry,material);
    const direction=new THREE.Vector3(...laneGeometry(approach).direction).multiplyScalar(outbound?-1:1);
    const arrow=new THREE.ArrowHelper(direction,start.clone().lerp(end,.5),2,0x437c99,.5,.25);
    helpers.add(arrow);disposables.push(arrow);
   }
  }
  if(debug.wireframe&&root){
   const copies=new Map<THREE.Material,THREE.Material>();
   root.traverse(object=>{
    const mesh=object as THREE.Mesh;if(!mesh.isMesh||mesh.userData.helper)return;
    const original=mesh.material;
    const clone=(mat:THREE.Material)=>{
     if(!copies.has(mat)){const copy=mat.clone() as THREE.MeshStandardMaterial;copy.wireframe=true;copies.set(mat,copy);disposables.push(copy)}
     return copies.get(mat)!;
    };
    mesh.material=Array.isArray(original)?original.map(clone):clone(original);restore.push(()=>{mesh.material=original});
   });
  }
  if(debug.lightHelpers){
   const sun=scene.getObjectByName("studio-sun") as THREE.DirectionalLight|undefined;
   if(sun){const helper=new THREE.DirectionalLightHelper(sun,3);helpers.add(helper);disposables.push(helper)}
  }
  scene.add(helpers);invalidate();
  return ()=>{restore.forEach(fn=>fn());scene.remove(helpers);disposables.forEach(resource=>resource.dispose())};
 },[definition,scene,invalidate,selected,preview,debug,layers,visible,headlights,wheels,lighting,quality]);
 return null;
}
