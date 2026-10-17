"use client";
import { VEHICLES } from "@/lib/studioConfig";
import { SCENE_ASSET_BY_ID } from "@/lib/sceneAssets";
import { useStudioStore } from "@/stores/useStudioStore";
import { Characters } from "./characters/Characters";
import { Buildings, Greenery, StreetFurniture } from "./environment/CityEnvironment";
import { IntersectionRoad } from "./roads/IntersectionRoad";
import { RoadSigns } from "./signs/RoadSigns";
import { TrafficLights } from "./traffic-lights/TrafficLights";
import { VehicleModel } from "./vehicles/VehicleModel";
import { ComposerObjects } from "../composer/ComposerObjects";
import { SceneAsset } from "./SceneAsset";

export function SceneObjects(){
 const preview=useStudioStore(s=>s.preview),selected=useStudioStore(s=>s.selectedId);
 if(preview){
  const asset=SCENE_ASSET_BY_ID[selected];
  return <group name="asset-preview">
   {asset.vehicle&&<VehicleModel asset={VEHICLES.find(v=>v.id===asset.vehicle)!}/>}
   {asset.layer==="characters"&&<Characters only={selected}/>}
   {asset.layer==="buildings"&&<Buildings only={selected}/>}
   {asset.layer==="signs"&&<RoadSigns only={selected}/>}
   {asset.layer==="lights"&&<TrafficLights only={selected}/>}
   {selected==="road"&&<SceneAsset asset={asset}><IntersectionRoad/></SceneAsset>}
   {selected==="greenery"&&<SceneAsset asset={asset}><Greenery/></SceneAsset>}
   {selected==="street-furniture"&&<SceneAsset asset={asset}><StreetFurniture/></SceneAsset>}
  </group>;
 }
 return <ComposerObjects/>;
}
