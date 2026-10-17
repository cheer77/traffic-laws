import type { AssetId } from "@traffic-laws/assets-3d/registry";
export const STUDIO_ASSET_IDS: Record<AssetId,string> = {
 "vehicle.sedan.standard":"vehicle-sedan", "vehicle.suv.standard":"vehicle-suv", "vehicle.motorcycle.standard":"vehicle-motorcycle",
 "vehicle.ambulance.ua":"vehicle-ambulance", "vehicle.police.ua":"vehicle-police", "vehicle.fire-truck.ua":"vehicle-fire",
 "character.man":"person-man", "character.woman":"person-woman", "character.senior":"person-senior", "character.youth":"person-youth",
 "building.home":"building-home", "building.office":"building-office", "building.shop":"building-shop", "building.town":"building-town",
 "sign.priority.yield.ua":"sign-yield-s", "sign.priority.main.ua":"sign-priority-e", "sign.priority.stop.ua":"sign-stop",
 "traffic-light.standard":"light-s", "intersection.city.standard":"road", "vegetation.city.collection":"greenery", "street-furniture.city.collection":"street-furniture"
};
