import { Batch, type InstanceTransform } from "../Primitives";
import { BUILDINGS } from "@/lib/sceneAssets";
import { SceneAsset } from "../SceneAsset";
import { AssetParts } from "../AssetParts";
import { AssetBuilder, extrudedProfile } from "../vehicles/assetBuilder";

export const BUILDING_DIMENSIONS=[
 {height:8.6,mat:"brick",width:11,depth:9},
 {height:11.5,mat:"stone",width:9,depth:11},
 {height:6.5,mat:"cream",width:12,depth:9},
 {height:4.8,mat:"cream",width:10,depth:11},
] as const;
function building(index:number){
 const {height,mat,width,depth}=BUILDING_DIMENSIONS[index],b=new AssetBuilder(),windows:InstanceTransform[]=[];
 b.box(mat,[0,height/2,0],[width,height,depth]);
 b.box("stone",[0,.23,0],[width+.1,.46,depth+.1]);
 b.box("roof",[0,height+.12,0],[width+.3,.24,depth+.3]);
 if(index===3){
  const roof=extrudedProfile([[0,-depth/2-.3],[1.3,0],[0,depth/2+.3]],width+.6);
  roof.translate(0,height+.22,0);b.add("roof",roof);
 }else{
  for(const side of [-1,1]){
   b.box("curb",[side*width/2,height+.35,0],[.16,.4,depth]);
   b.box("curb",[0,height+.35,side*depth/2],[width,.4,.16]);
  }
  b.box("roof",[0,height+.5,0],[2.1,.7,1.6]);
 }
 const ww=index===1?1.55:1.2,wh=index===1?1.65:1.2;
 for(let y=3.5;y<height-.65;y+=index===1?2.35:2.1){
  for(const side of [-1,1]){
   for(let x=-width/2+1.5;x<width/2-1;x+=2.2){
    windows.push({position:[x,y,side*(depth/2+.025)],scale:[ww,wh,.035]});
    b.box("curb",[x,y,side*(depth/2+.012)],[ww+.13,wh+.13,.024]);
    b.box("roof",[x,y,side*(depth/2+.048)],[.045,wh,.015]);
    if(index===0){
     b.box("curb",[x,y-wh/2-.15,side*(depth/2+.3)],[1.6,.12,.65]);
     b.box("dark",[x,y-.14,side*(depth/2+.6)],[1.5,.035,.035]);
     for(const dx of [-.7,0,.7])b.box("dark",[x+dx,y-.4,side*(depth/2+.6)],[.03,.55,.03]);
    }
   }
   for(let z=-depth/2+1.5;z<depth/2-1;z+=2.2){
    windows.push({position:[side*(width/2+.025),y,z],scale:[.035,wh,ww]});
    b.box("curb",[side*(width/2+.012),y,z],[.024,wh+.13,ww+.13]);
   }
  }
 }
 b.box("dark",[0,1.17,depth/2+.025],[1.65,2.34,.04]);
 b.box("glass",[0,1.2,depth/2+.052],[1.45,2.16,.018]);
 b.box("chrome",[0,1.2,depth/2+.068],[.06,2.15,.02]);
 for(const side of [-1,1])b.box("chrome",[side*.12,1.1,depth/2+.09],[.025,.31,.025]);
 b.box(index===2?"teal":"roof",[0,2.6,depth/2+.45],[index===2?width:2.5,.13,1.1]);
 if(index===2||index===1)for(const side of [-1,1]){
  const windowWidth=index===1?2.1:2.8,windowCenter=index===1?3.05:3.4;
  b.box("dark",[side*windowCenter,1.25,depth/2+.025],[windowWidth,2.1,.04]);
  b.box("glass",[side*windowCenter,1.25,depth/2+.052],[windowWidth-.15,1.95,.02]);
 }
 return {parts:b.finish(),windows};
}
export const BUILDING_PARTS=BUILDINGS.map((_,index)=>building(index));

const treeTrunks:InstanceTransform[]=[],roundCrowns:InstanceTransform[]=[],tallCrowns:InstanceTransform[]=[],bushes:InstanceTransform[]=[];
const treePositions=[[-9,-12],[-9,-23],[-26,-9],[10,-9],[25,-9],[10,-26],[-10,10],[-10,27],[-27,10],[10,12],[10,26],[27,10]];
for(const [index,[x,z]] of treePositions.entries()){
 const tall=index%3===0,height=tall?4.05:3.25+index%3*.25;
 treeTrunks.push({position:[x,1.5,z],scale:[.16,2.68,.16]});
 (tall?tallCrowns:roundCrowns).push({position:[x,height,z],scale:tall?[1.1,2.5,1.15]:[1.65,1.8,1.45],rotation:[0,index*.71,.06*(index%2?1:-1)]});
 bushes.push({position:[x+1.8,.58,z+1],scale:[1.1+(index%2)*.2,.42,.78]});
}
const furniture=new AssetBuilder();
for(const [x,z] of [[-7,-13],[7,13],[-13,7],[13,-7],[-7,-28],[7,28]]){
 furniture.bar("dark",[x,.16,z],[x,5.8,z],.055);
 furniture.box("dark",[x+(x>0?-.55:.55),5.8,z],[1.2,.08,.12]);
 furniture.box("white",[x+(x>0?-.9:.9),5.72,z],[.56,.05,.28],undefined,true);
}
for(const [x,z] of [[-9,17],[16,9],[-16,-9]]){
 for(let slat=0;slat<3;slat++)furniture.box("trunk",[x,.65,z-.22+slat*.22],[2.2,.09,.18]);
 for(const y of [.9,1.14])furniture.box("trunk",[x,y,z-.35],[2.2,.18,.08]);
 for(const side of [-.75,.75])furniture.box("dark",[x+side,.4,z],[.07,.48,.5]);
}
const furnitureParts=furniture.finish();

export function Buildings({only}:{only?:string}){return <group>
 {BUILDINGS.map((asset,index)=>!only||asset.id===only?<SceneAsset key={asset.id} asset={asset}>
  <AssetParts parts={BUILDING_PARTS[index].parts}/>
  <Batch items={BUILDING_PARTS[index].windows} mat="glass" cast={false}/>
 </SceneAsset>:null)}
 </group>}
export function Greenery(){return <group>
 <Batch items={treeTrunks} mat="trunk" shape="cylinder"/>
 <Batch items={roundCrowns} mat="leaf" shape="foliage"/>
 <Batch items={tallCrowns} mat="leafLight" shape="foliage"/>
 <Batch items={bushes} mat="leafLight" shape="foliage"/>
 </group>}
export function StreetFurniture(){return <AssetParts parts={furnitureParts}/>}
