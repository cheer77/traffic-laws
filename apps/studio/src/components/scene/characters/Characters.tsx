import { CHARACTERS } from "@/lib/sceneAssets";
import { SceneAsset } from "../SceneAsset";
import { AssetBuilder, type Point } from "../vehicles/assetBuilder";
import { AssetParts } from "../AssetParts";
import type { MaterialName } from "../resources";

function person(index:number){
 const b=new AssetBuilder(),senior=index===2,woman=index===1,youth=index===3;
 const shirt:MaterialName=(["teal","shirt","cream","blue"] as const)[index];
 const skin:MaterialName=youth?"skinDark":"skin",hair:MaterialName=senior?"chrome":"hair";
 const height=woman?.96:senior?.95:1,lean=senior?.07:0;
 const p=(x:number,y:number,z:number):Point=>[x,y*height,z+lean*y];
 b.bar(shirt,p(0,.91,0),p(0,1.33,0),woman?.19:.22);
 b.box("pants",p(0,.83,0),[.35,.19,.24],undefined,true);
 b.bar(skin,p(0,1.38,0),p(0,1.52,0),.067);
 b.ball(skin,p(0,1.66,0),[.16,.205,.16]);
 b.ball(hair,p(0,1.79,-.025),[.165,.095,.15]);
 if(woman)b.box("hair",p(0,1.6,-.135),[.29,.32,.11],undefined,true);
 b.ball(skin,p(0,1.65,.156),[.035,.044,.036]);
 for(const side of [-1,1]){
  b.ball("dark",p(side*.057,1.7,.151),[.012,.012,.009]);
  const shoulder=p(side*.21,1.32,0),elbow=p(side*.28,1.09,.02),hand=p(side*.28,.86,senior&&side<0?.18:.04);
  b.bar(shirt,shoulder,elbow,.065);b.bar(shirt,elbow,hand,.054);b.ball(skin,hand,[.06,.075,.055]);
  const hip=p(side*.105,.81,0),knee=p(side*.11,.46,.025),ankle=p(side*.12,.15,0);
  b.bar("pants",hip,knee,.074);b.bar("pants",knee,ankle,.062);
  b.box("rubber",p(side*.12,.07,.065),[.17,.13,.29],undefined,true);
 }
 if(senior){b.bar("trunk",p(-.28,.87,.18),[-.3,0,.25],.018);b.bar("trunk",p(-.33,.87,.18),p(-.23,.87,.18),.022)}
 if(youth){b.box("gold",p(0,1.15,-.21),[.31,.4,.17],undefined,true);for(const side of [-1,1])b.bar("dark",p(side*.14,1.37,.12),p(side*.14,.96,.13),.016)}
 return b.finish();
}
export const CHARACTER_PARTS=CHARACTERS.map((_,index)=>person(index));
export function Characters({only}:{only?:string}){return <group>
 {CHARACTERS.map((asset,index)=>!only||asset.id===only?<SceneAsset key={asset.id} asset={asset}><AssetParts parts={CHARACTER_PARTS[index]}/></SceneAsset>:null)}
 </group>}
