import { create } from "zustand";
import { VEHICLES } from "@/lib/studioConfig";
import { SCENE_ASSET_BY_ID } from "@/lib/sceneAssets";
import type { CameraMode, DebugFlag, Inspection, Layer, Quality, RenderMetrics, Signal, TrafficSignal, VehicleKind } from "@/types/studio";

const defaultVisible = Object.fromEntries(VEHICLES.map(v=>[v.id,true])) as Record<VehicleKind,boolean>;
interface StudioState {
 visible:Record<VehicleKind,boolean>; active:VehicleKind; layers:Record<Layer,boolean>;
 camera:CameraMode; cameraRevision:number; quality:Quality; signal:Signal; headlights:boolean;
 beacon:boolean; wheelPreview:boolean; grid:boolean; sun:number; panelOpen:boolean;
 metrics:RenderMetrics; rendering:boolean; ready:boolean;
 selectedId:string; preview:boolean; previewAngle:"front"|"rear"|"side"; shadows:boolean; lighting:"day"|"evening"; frameLimit:30|60;
 debug:Record<DebugFlag,boolean>; trafficSignal:TrafficSignal; inspection:Inspection|null;
 selectObject:(id:string,focus?:boolean)=>void; setPreview:(preview:boolean)=>void; setPreviewAngle:(angle:"front"|"rear"|"side")=>void;
 setLighting:(lighting:"day"|"evening")=>void; setFrameLimit:(fps:30|60)=>void;
 toggleDebug:(flag:DebugFlag)=>void; setTrafficSignal:(signal:TrafficSignal)=>void; setInspection:(inspection:Inspection|null)=>void;
 toggleVehicle:(id:VehicleKind)=>void; select:(id:VehicleKind)=>void;
 toggleLayer:(layer:Layer)=>void; setCamera:(camera:CameraMode)=>void;
 setQuality:(quality:Quality)=>void; setSignal:(signal:Signal)=>void;
 toggle:(key:"headlights"|"beacon"|"wheelPreview"|"grid"|"panelOpen"|"shadows")=>void;
 setSun:(sun:number)=>void; setMetrics:(metrics:RenderMetrics)=>void;
 setRendering:(rendering:boolean)=>void; setReady:()=>void; reset:()=>void;
}
const defaults={visible:defaultVisible,active:"sedan" as VehicleKind,layers:{characters:true,buildings:true,trees:true,signs:true,lights:true},camera:"iso" as CameraMode,quality:"medium" as Quality,signal:"off" as Signal,headlights:true,beacon:false,wheelPreview:false,grid:false,sun:1.8,
 selectedId:"vehicle-sedan",preview:false,previewAngle:"front" as const,shadows:true,lighting:"day" as const,frameLimit:60 as const,
 debug:{bounds:false,axes:false,lanes:false,wireframe:false,lightHelpers:false},trafficSignal:"junction" as TrafficSignal,inspection:null};
export const useStudioStore=create<StudioState>((set)=>({
 ...defaults,cameraRevision:0,panelOpen:false,metrics:{fps:0,frameTime:0,calls:0,triangles:0},rendering:false,ready:false,
 toggleVehicle:id=>set(s=>({visible:{...s.visible,[id]:!s.visible[id]}})),
 select:id=>set(s=>({active:id,selectedId:`vehicle-${id}`,inspection:null,visible:{...s.visible,[id]:true},camera:"focus",cameraRevision:s.cameraRevision+1,signal:"off",beacon:false,wheelPreview:false})),
 selectObject:(id,focus=true)=>set(s=>{
  const asset=SCENE_ASSET_BY_ID[id];if(!asset)return {};
  return {selectedId:id,inspection:null,active:asset.vehicle??s.active,visible:asset.vehicle?{...s.visible,[asset.vehicle]:true}:s.visible,
   layers:asset.layer?{...s.layers,[asset.layer]:true}:s.layers,camera:focus?"focus":"free",cameraRevision:focus?s.cameraRevision+1:s.cameraRevision,signal:"off",beacon:false,wheelPreview:false};
 }),
 setPreview:preview=>set(s=>({preview,camera:preview?"focus":"iso",cameraRevision:s.cameraRevision+1,inspection:null})),
 setPreviewAngle:previewAngle=>set(s=>({previewAngle,camera:"focus",cameraRevision:s.cameraRevision+1})),
 setLighting:lighting=>set({lighting}),setFrameLimit:frameLimit=>set({frameLimit}),
 toggleDebug:flag=>set(s=>({debug:{...s.debug,[flag]:!s.debug[flag]}})),
 setTrafficSignal:trafficSignal=>set({trafficSignal}),setInspection:inspection=>set({inspection}),
 toggleLayer:layer=>set(s=>({layers:{...s.layers,[layer]:!s.layers[layer]}})),
 setCamera:camera=>set(s=>{
  const asset=SCENE_ASSET_BY_ID[s.selectedId];
  return {camera,cameraRevision:s.cameraRevision+1,...(camera==="focus"?{
   visible:asset?.vehicle?{...s.visible,[asset.vehicle]:true}:s.visible,
   layers:asset?.layer?{...s.layers,[asset.layer]:true}:s.layers,
  }:{})};
 }),
 setQuality:quality=>set({quality}),setSignal:signal=>set({signal}),
 toggle:key=>set(s=>({[key]:!s[key]})),setSun:sun=>set({sun}),
 setMetrics:metrics=>set({metrics}),setRendering:rendering=>set({rendering}),setReady:()=>set({ready:true}),
 reset:()=>set(s=>({...defaults,cameraRevision:s.cameraRevision+1})),
}));
