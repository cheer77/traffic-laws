"use client";
import { LIGHTS } from "@/lib/sceneAssets";
import { useStudioStore } from "@/stores/useStudioStore";
import type { TrafficSignal } from "@/types/studio";
import { Ball } from "../Primitives";
import { SceneAsset } from "../SceneAsset";
import { AssetBuilder } from "../vehicles/assetBuilder";
import { AssetParts } from "../AssetParts";
import * as THREE from "three";

const builder=new AssetBuilder();
builder.bar("dark",[0,.16,0],[0,4.38,0],.055);
builder.box("dark",[0,.23,0],[.25,.13,.25],undefined,true);
builder.box("dark",[0,3.6,.08],[.56,1.48,.38],undefined,true);
for(const y of [3.08,4.12])builder.box("chrome",[0,y,-.03],[.17,.09,.23]);
for(const y of [3.2,3.6,4]){
 // Open cylindrical hood, rather than a flat floating visor.
 const hood=new THREE.CylinderGeometry(.18,.18,.16,12,1,true,Math.PI*.5,Math.PI);
 hood.rotateX(Math.PI/2);hood.translate(0,y,.34);builder.add("dark",hood);
}
const parts=builder.finish();
export function signalFor(index:number,mode:TrafficSignal){
 return mode==="junction"?(index<2?"green":"red"):mode;
}
export function TrafficLights({only}:{only?:string}){
 const mode=useStudioStore(s=>s.trafficSignal);
 return <group>{LIGHTS.map((asset,index)=>!only||asset.id===only?<SceneAsset key={asset.id} asset={asset}>
  <AssetParts parts={parts}/>
  {(["red","yellow","green"] as const).map((color,i)=><group key={color} position={[0,4-i*.4,.282]}>
   <Ball scale={[.145,.145,.035]} mat={signalFor(index,mode)===color?color==="red"?"trafficRed":color==="yellow"?"trafficAmber":"trafficGreen":"black"}/>
  </group>)}
 </SceneAsset>:null)}</group>;
}
