import { VEHICLES } from "./studioConfig";
import type { Layer, VehicleKind } from "@/types/studio";
import type { Vec3 } from "./roadGeometry";

export interface SceneAsset {id:string;name:string;type:string;position:Vec3;rotation:number;size:number;layer?:Layer;vehicle?:VehicleKind;}
export const CHARACTERS:SceneAsset[]=[
 {id:"person-man",name:"Чоловік",type:"Персонаж",position:[6.7,.16,6],rotation:-.6,size:2,layer:"characters"},
 {id:"person-woman",name:"Жінка",type:"Персонаж",position:[7.7,.16,6.1],rotation:-1.3,size:2,layer:"characters"},
 {id:"person-senior",name:"Літня людина",type:"Персонаж",position:[-6.7,.16,-7.5],rotation:Math.PI/2,size:2,layer:"characters"},
 {id:"person-youth",name:"Юнак",type:"Персонаж",position:[-8,.16,8],rotation:2.2,size:2,layer:"characters"},
];
export const BUILDINGS:SceneAsset[]=[
 {id:"building-home",name:"Житловий будинок",type:"Будівля",position:[-18,.16,-18],rotation:0,size:14,layer:"buildings"},
 {id:"building-office",name:"Офіс",type:"Будівля",position:[18,.16,-18],rotation:0,size:15,layer:"buildings"},
 {id:"building-shop",name:"Крамниця",type:"Будівля",position:[-19,.16,19],rotation:Math.PI,size:14,layer:"buildings"},
 {id:"building-town",name:"Міський будинок",type:"Будівля",position:[19,.16,20],rotation:Math.PI,size:14,layer:"buildings"},
];
export const SIGNS:SceneAsset[]=[
 {id:"sign-yield-s",name:"Дати дорогу · південь",type:"Знак",position:[6.4,0,10.7],rotation:0,size:3,layer:"signs"},
 {id:"sign-yield-n",name:"Дати дорогу · північ",type:"Знак",position:[-6.4,0,-10.7],rotation:Math.PI,size:3,layer:"signs"},
 {id:"sign-priority-e",name:"Головна дорога · схід",type:"Знак",position:[10.7,0,-6.4],rotation:Math.PI/2,size:3,layer:"signs"},
 {id:"sign-priority-w",name:"Головна дорога · захід",type:"Знак",position:[-10.7,0,6.4],rotation:-Math.PI/2,size:3,layer:"signs"},
 // Library sample on the paved forecourt, not an additional instruction at the junction.
 {id:"sign-stop",name:"STOP · зразок бібліотеки",type:"Знак",position:[-12,.16,10],rotation:0,size:3,layer:"signs"},
];
export const LIGHTS:SceneAsset[]=[
 {id:"light-s",name:"Світлофор · південь",type:"Світлофор",position:[5.8,0,9.2],rotation:0,size:4.4,layer:"lights"},
 {id:"light-n",name:"Світлофор · північ",type:"Світлофор",position:[-5.8,0,-9.2],rotation:Math.PI,size:4.4,layer:"lights"},
 {id:"light-e",name:"Світлофор · схід",type:"Світлофор",position:[9.2,0,-5.8],rotation:Math.PI/2,size:4.4,layer:"lights"},
 {id:"light-w",name:"Світлофор · захід",type:"Світлофор",position:[-9.2,0,5.8],rotation:-Math.PI/2,size:4.4,layer:"lights"},
];
export const SCENE_ASSETS:SceneAsset[]=[
 ...VEHICLES.map(v=>({id:`vehicle-${v.id}`,name:v.name,type:"Транспорт",position:v.position,rotation:v.rotation,size:v.length,vehicle:v.id})),
 ...CHARACTERS,...BUILDINGS,...SIGNS,...LIGHTS,
 {id:"road",name:"Перехрестя",type:"Дорога",position:[0,0,0],rotation:0,size:69},
 {id:"greenery",name:"Озеленення",type:"Середовище",position:[0,0,0],rotation:0,size:64,layer:"trees"},
 {id:"street-furniture",name:"Міські меблі",type:"Середовище",position:[0,0,0],rotation:0,size:64},
];
export const SCENE_ASSET_BY_ID=Object.fromEntries(SCENE_ASSETS.map(asset=>[asset.id,asset]));
