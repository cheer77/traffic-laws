"use client";
import { SelectionRing } from "../SelectionRing";
import { VehicleModel as Model } from "@traffic-laws/assets-3d/vehicles/VehicleModel";
import { useStudioStore } from "@/stores/useStudioStore";
import type { VehicleAsset } from "@/types/studio";
export function VehicleModel({asset}:{asset:VehicleAsset}) {
 const active=useStudioStore(s=>s.selectedId===`vehicle-${asset.id}`),headlights=useStudioStore(s=>s.headlights),preview=useStudioStore(s=>s.preview);
 const ringRadius=asset.id==="fire"?3.5:asset.id==="ambulance"?3:asset.id==="motorcycle"?1.35:2.55;
 return <group name={`vehicle-${asset.id}`} userData={{inspectable:true}} position={preview?[0,0,0]:asset.position} rotation-y={preview?0:asset.rotation} onClick={event=>{event.stopPropagation();if(event.delta>3)return;useStudioStore.getState().selectObject(`vehicle-${asset.id}`,false)}}>
 {active&&!preview&&<SelectionRing radius={ringRadius}/>}
 <Model kind={asset.id} active={active} headlights={headlights} readAnimation={useStudioStore.getState}/>
 </group>;
}
