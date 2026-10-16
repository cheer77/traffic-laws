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
import { SceneAsset } from "./SceneAsset";

export function SceneObjects(){
 const visible=useStudioStore(s=>s.visible),layers=useStudioStore(s=>s.layers);
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
 return <group name="city-scene">
  <SceneAsset asset={SCENE_ASSET_BY_ID.road}><IntersectionRoad/></SceneAsset>
  {layers.buildings&&<group name="buildings"><Buildings/></group>}
  {layers.trees&&<SceneAsset asset={SCENE_ASSET_BY_ID.greenery}><Greenery/></SceneAsset>}
  <SceneAsset asset={SCENE_ASSET_BY_ID["street-furniture"]}><StreetFurniture/></SceneAsset>
  {layers.characters&&<group name="characters"><Characters/></group>}
  {layers.signs&&<group name="signs"><RoadSigns/></group>}
  {layers.lights&&<group name="traffic-lights"><TrafficLights/></group>}
  {VEHICLES.filter(asset=>visible[asset.id]).map(asset=><VehicleModel key={asset.id} asset={asset}/>)}
 </group>;
}
