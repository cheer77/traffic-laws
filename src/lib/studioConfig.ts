import type { Quality, VehicleAsset } from "@/types/studio";
import { laneGeometry, lanePoint } from "./roadGeometry";

export const VEHICLES: VehicleAsset[] = [
 {id:"sedan",name:"Легковий автомобіль",category:"Urban sedan",color:"#3b78b4",position:lanePoint("south",12),rotation:laneGeometry("south").rotation,length:4.5},
 {id:"suv",name:"Позашляховик",category:"Compact SUV",color:"#71867c",position:lanePoint("north",13),rotation:0,length:4.7},
 {id:"motorcycle",name:"Мотоцикл",category:"Street motorcycle",color:"#e7ac46",position:lanePoint("south",19),rotation:Math.PI,length:2.2},
 {id:"ambulance",name:"Швидка допомога",category:"Emergency van",color:"#f1efe7",position:lanePoint("west",13),rotation:Math.PI/2,length:5.8},
 {id:"police",name:"Поліція",category:"Patrol sedan",color:"#e9edf0",position:lanePoint("east",13),rotation:-Math.PI/2,length:4.5},
 {id:"fire",name:"Пожежна машина",category:"Rescue truck",color:"#bd4d3b",position:lanePoint("west",21),rotation:Math.PI/2,length:7},
];
export const ASSET_BY_ID = Object.fromEntries(VEHICLES.map(asset=>[asset.id,asset])) as Record<VehicleAsset["id"],VehicleAsset>;
export const QUALITY: Record<Quality,{label:string;dpr:[number,number];shadows:boolean;shadowSize:number}> = {
 low:{label:"Low",dpr:[.75,1],shadows:false,shadowSize:512},
 medium:{label:"Medium",dpr:[1,1.4],shadows:true,shadowSize:1024},
 high:{label:"High",dpr:[1,1.8],shadows:true,shadowSize:2048},
};
