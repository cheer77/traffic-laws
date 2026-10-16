"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStudioStore } from "@/stores/useStudioStore";
import type { VehicleAsset } from "@/types/studio";
import { geometry, material } from "../resources";
import { VEHICLE_GEOMETRY, RIDER_GEOMETRY } from "./vehicleAssets";
import { VehicleLabels } from "./VehicleLabels";
import { VEHICLE_ROUNDED, type GeometryPart } from "./assetBuilder";

function Parts({parts,headlights=true}:{parts:GeometryPart[];headlights?:boolean}){return <>
 {parts.map(part=><mesh key={part.material} name={`part-${part.material}`} geometry={part.geometry} material={material[part.material==="headlight"&&!headlights?"chrome":part.material]} castShadow={!["vehicleGlass","headlight","tail"].includes(part.material)} receiveShadow dispose={null}/>)}
 </>}

export function VehicleModel({asset}:{asset:VehicleAsset}){
 const active=useStudioStore(state=>state.selectedId===`vehicle-${asset.id}`),headlights=useStudioStore(state=>state.headlights),preview=useStudioStore(s=>s.preview);
 const wheels=useRef<THREE.Group>(null),lamps=useRef<THREE.Group>(null),beacon=useRef<THREE.Group>(null),time=useRef(0);
 const model=VEHICLE_GEOMETRY[asset.id],bike=asset.id==="motorcycle";
 const {radius,width,track,axles,centerY}=model.wheels;
 useFrame((_,delta)=>{
  if(!active)return;
  const state=useStudioStore.getState();time.current+=Math.min(delta,.05);
  if(wheels.current&&state.wheelPreview)for(const wheel of wheels.current.children)wheel.rotation.x-=Math.min(delta,.05)*3;
  const on=Math.floor(time.current/.4)%2===0;
  if(lamps.current)for(const lamp of lamps.current.children)lamp.visible=on&&(state.signal==="hazard"||(lamp.position.x<0?state.signal==="right":state.signal==="left"));
  if(beacon.current)for(let index=0;index<beacon.current.children.length;index++)beacon.current.children[index].visible=state.beacon&&Math.floor(time.current/.18)%2===index%2;
 });
 const lightY=asset.id==="fire"?1.12:asset.id==="ambulance"?.89:asset.id==="suv"?1:bike?.97:.81;
 const ringRadius=asset.id==="fire"?3.5:asset.id==="ambulance"?3:bike?1.35:2.55;
 return <group name={`vehicle-${asset.id}`} userData={{inspectable:true}} position={preview?[0,0,0]:asset.position} rotation-y={preview?0:asset.rotation} onClick={event=>{event.stopPropagation();if(event.delta>3)return;useStudioStore.getState().selectObject(`vehicle-${asset.id}`,false)}}>
  {active&&!preview&&<mesh userData={{helper:true}} rotation-x={-Math.PI/2} position-y={.025}><ringGeometry args={[ringRadius,ringRadius+.04,64]}/><meshBasicMaterial color="#c5a16a" transparent opacity={.85}/></mesh>}
  <group name={`body-${asset.id}`}><Parts parts={model.parts} headlights={headlights}/></group>
  <VehicleLabels kind={asset.id}/>
  {bike&&<group name="motorcycle-rider"><Parts parts={RIDER_GEOMETRY}/></group>}
  <group name={`wheels-${asset.id}`} ref={wheels}>{axles.flatMap(z=>(bike?[0]:[-track,track]).map(x=><group key={`${x}-${z}`} position={[x,centerY,z]}>
   <mesh geometry={geometry.tire} material={material.rubber} rotation-z={Math.PI/2} scale={[radius,width,radius]} castShadow dispose={null}/>
   <mesh geometry={geometry.rim} material={material.chrome} scale={[width,radius,radius]} dispose={null}/>
  </group>))}</group>
  <group ref={lamps} name={`signals-${asset.id}`} visible={active}>{[-1,1].flatMap(side=>[-1,1].map(end=><mesh key={`${side}-${end}`} position={[side*(bike?.27:model.halfWidth-.1),lightY,end*(model.length/2+.052)]} geometry={geometry.box} material={material.signal} scale={[bike?.09:.104,.078,.016]} dispose={null}/>))}</group>
  {model.beacon&&<group ref={beacon} name={`beacon-${asset.id}`} visible={active}>
   {[-1,1].map(side=><mesh key={side} position={[side*model.beacon!.width*.29,model.beacon!.roofY+.125,model.beacon!.z]} geometry={VEHICLE_ROUNDED} material={material.beacon} scale={[model.beacon!.width*.372,.134,.244]} dispose={null}/>)}
  </group>}
 </group>;
}
