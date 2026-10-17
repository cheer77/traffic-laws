"use client";
import type { ComponentType } from "react";
import { VehicleModel } from "../vehicles/VehicleModel";
import { Character } from "../characters/Characters";
import { Building, Greenery, StreetFurniture } from "../environment/CityEnvironment";
import { RoadSign } from "../signs/RoadSign";
import { TrafficLight } from "../traffic-lights/TrafficLight";
import { IntersectionRoad } from "../roads/IntersectionRoad";
import type { AssetId } from "./definitions";
export const ASSET_MODELS = {
  "vehicle.sedan.standard": () => <VehicleModel kind="sedan" />,
  "vehicle.suv.standard": () => <VehicleModel kind="suv" />,
  "vehicle.motorcycle.standard": () => <VehicleModel kind="motorcycle" />,
  "vehicle.ambulance.ua": () => <VehicleModel kind="ambulance" />,
  "vehicle.police.ua": () => <VehicleModel kind="police" />,
  "vehicle.fire-truck.ua": () => <VehicleModel kind="fire" />,
  "character.man": () => <Character index={0} />,
  "character.woman": () => <Character index={1} />,
  "character.senior": () => <Character index={2} />,
  "character.youth": () => <Character index={3} />,
  "building.home": () => <Building index={0} />,
  "building.office": () => <Building index={1} />,
  "building.shop": () => <Building index={2} />,
  "building.town": () => <Building index={3} />,
  "sign.priority.yield.ua": () => <RoadSign kind="yield" />,
  "sign.priority.main.ua": () => <RoadSign kind="priority" />,
  "sign.priority.stop.ua": () => <RoadSign kind="stop" />,
  "traffic-light.standard": TrafficLight,
  "intersection.city.standard": IntersectionRoad,
  "vegetation.city.collection": Greenery,
  "street-furniture.city.collection": StreetFurniture,
} satisfies Record<AssetId, ComponentType>;
