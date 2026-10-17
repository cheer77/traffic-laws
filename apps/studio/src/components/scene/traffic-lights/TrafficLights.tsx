"use client";
import { LIGHTS } from "@/lib/sceneAssets";
import { useStudioStore } from "@/stores/useStudioStore";
import type { TrafficSignal } from "@/types/studio";
import { SceneAsset } from "../SceneAsset";
import { TrafficLight } from "@traffic-laws/assets-3d/traffic-lights/TrafficLight";
export function signalFor(index:number,mode:TrafficSignal){
 return mode==="junction"?(index<2?"green":"red"):mode;
}
export function TrafficLights({only}:{only?:string}){const mode=useStudioStore(s=>s.trafficSignal);return <group>{LIGHTS.map((asset,index)=>!only||asset.id===only?<SceneAsset key={asset.id} asset={asset}><TrafficLight signal={signalFor(index,mode)}/></SceneAsset>:null)}</group>}
