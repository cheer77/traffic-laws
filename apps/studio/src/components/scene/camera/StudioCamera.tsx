"use client";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { sceneAsset } from "@/lib/composer/selection";
import { useComposerStore } from "@/stores/useComposerStore";
import { inspectObject } from "@/lib/objectInspection";
import { useStudioStore } from "@/stores/useStudioStore";
import { CITY_CAMERA_TARGET, INITIAL_CAMERA_POSITION } from "./cameraConfig";

export function StudioCamera({enabled}:{enabled:boolean}){
 const controls=useRef<OrbitControlsImpl>(null),desired=useRef(new THREE.Vector3(...INITIAL_CAMERA_POSITION)),target=useRef(new THREE.Vector3(...CITY_CAMERA_TARGET)),transitioning=useRef(false);
 const invalidate=useThree(s=>s.invalidate),scene=useThree(s=>s.scene);
 const width=useThree(s=>s.size.width),height=useThree(s=>s.size.height);
 const mode=useStudioStore(s=>s.camera),revision=useStudioStore(s=>s.cameraRevision),selected=useStudioStore(s=>s.selectedId);
 const dragging=useComposerStore(s=>s.dragging);
 const preview=useStudioStore(s=>s.preview),angle=useStudioStore(s=>s.previewAngle);
 useEffect(()=>{
  if(mode==="free"){transitioning.current=false;if(controls.current)controls.current.enableDamping=true;return}
  // Drain the previous gesture's inertia before starting a camera command.
  if(controls.current){controls.current.enableDamping=false;controls.current.update()}
  const asset=sceneAsset(useComposerStore.getState().scene,selected,preview),object=scene.getObjectByName(selected),info=object?inspectObject(object):null;
  if(preview||mode==="focus"){
   const size=info?Math.max(...info.size):asset.size;
   if(info)target.current.fromArray(info.min).add(new THREE.Vector3().fromArray(info.max)).multiplyScalar(.5);
   else if(preview)target.current.set(0,asset.size*.2,0);
   else{target.current.fromArray(asset.position);target.current.y=1}
   const distance=Math.max(2,size)*Math.max(1,height/width*.85);
   const direction=mode==="top"?new THREE.Vector3(.001,1.9,.001):
    preview&&angle==="rear"?new THREE.Vector3(-1,.65,-1.25):preview&&angle==="side"?new THREE.Vector3(1.7,.25,.001):new THREE.Vector3(1.2,.85,1.25);
   // Stay inside OrbitControls.maxDistance so a large preview on a narrow
   // viewport can settle instead of lerping forever against the zoom clamp.
   desired.current.copy(target.current).addScaledVector(direction,Math.min(distance,140/direction.length()));
  }else if(mode==="top"){desired.current.set(.05,65,.05);target.current.set(0,0,0)}
  else{const scale=Math.max(1,Math.min(1.25,Math.sqrt(height/Math.max(1,width))));target.current.set(...CITY_CAMERA_TARGET);desired.current.set(...INITIAL_CAMERA_POSITION).sub(target.current).multiplyScalar(scale).add(target.current)}
  transitioning.current=true;invalidate();
 },[mode,revision,selected,preview,angle,invalidate,width,height,scene]);
 useFrame(({camera},delta)=>{
  if(!enabled||dragging)return;
  if(controls.current){controls.current.target.x=THREE.MathUtils.clamp(controls.current.target.x,-100,100);controls.current.target.z=THREE.MathUtils.clamp(controls.current.target.z,-100,100);controls.current.target.y=Math.max(0,controls.current.target.y)}
  camera.position.y=Math.max(.2,camera.position.y);
  if(!transitioning.current||!controls.current)return;
  const alpha=1-Math.exp(-Math.min(delta,.05)*8);
  camera.position.lerp(desired.current,alpha);controls.current.target.lerp(target.current,alpha);controls.current.update();
  if(camera.position.distanceToSquared(desired.current)<.001&&controls.current.target.distanceToSquared(target.current)<.001){transitioning.current=false;controls.current.enableDamping=true}
  else invalidate();
 });
 return <OrbitControls ref={controls} makeDefault enabled={enabled&&!dragging} enableDamping dampingFactor={.12} enablePan screenSpacePanning={false} minDistance={preview?.6:3} maxDistance={150} minPolarAngle={.001} maxPolarAngle={Math.PI/2-.04} regress onStart={()=>{transitioning.current=false;if(controls.current)controls.current.enableDamping=true;const state=useStudioStore.getState();if(state.camera!=="free")state.setCamera("free")}}/>;
}
