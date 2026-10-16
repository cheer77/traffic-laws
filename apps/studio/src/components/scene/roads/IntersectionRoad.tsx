import { Batch, Box, type InstanceTransform } from "../Primitives";
import { ROAD } from "@/lib/roadGeometry";

export const roadDashes:InstanceTransform[]=[],crosswalks:InstanceTransform[]=[],curbs:InstanceTransform[]=[],stopLines:InstanceTransform[]=[];
const half=ROAD.width/2,y=ROAD.markingY;
for(const sign of [-1,1]){
 for(let offset=11;offset<=31;offset+=4){
  roadDashes.push({position:[0,y,offset*sign],scale:[.1,.012,2]},{position:[offset*sign,y,0],scale:[2,.012,.1]});
 }
 for(let stripe=-4;stripe<=4;stripe++){
  crosswalks.push({position:[stripe*1.04,y,sign*ROAD.crossingCenter],scale:[.55,.012,ROAD.crossingDepth]},
   {position:[sign*ROAD.crossingCenter,y,stripe*1.04],scale:[ROAD.crossingDepth,.012,.55]});
 }
 for(const side of [-1,1])for(let offset=5.5;offset<33;offset++){
  const lowered=Math.abs(offset-ROAD.crossingCenter)<1.2;
  curbs.push({position:[side*(half+.12),lowered?.045:.08,offset*sign],scale:[.24,lowered?.09:.16,.96]},
   {position:[offset*sign,lowered?.045:.08,side*(half+.12)],scale:[.96,lowered?.09:.16,.24]});
 }
 stopLines.push({position:[sign*ROAD.laneWidth/2,y,sign*ROAD.stopDistance],scale:[ROAD.laneWidth-.3,.012,.22]},
  {position:[sign*ROAD.stopDistance,y,-sign*ROAD.laneWidth/2],scale:[.22,.012,ROAD.laneWidth-.3]});
}

export function IntersectionRoad(){return <group>
 <Box position={[0,-.48,0]} scale={[69,.8,69]} mat="ground" rounded/>
 {/* Disjoint slabs share exactly the same surface height. */}
 <Box position={[0,-.09,0]} scale={[ROAD.width,.18,66]} mat="asphalt"/>
 {[-1,1].map(side=><Box key={side} position={[side*(33+half)/2,-.09,0]} scale={[33-half,.18,ROAD.width]} mat="asphalt"/>)}
 {[-1,1].flatMap(x=>[-1,1].map(z=><group key={`${x}-${z}`}>
  <Box position={[x*19.05,.04,z*19.05]} scale={[27.9,.24,27.9]} mat="paving"/>
  <Box position={[x*21,.17,z*21]} scale={[17.8,.02,17.8]} mat="ground"/>
 </group>))}
 <Batch items={roadDashes} mat="white" cast={false}/>
 <Batch items={crosswalks} mat="white" cast={false}/>
 <Batch items={curbs} mat="curb" cast={false}/>
 <Batch items={stopLines} mat="white" cast={false}/>
 </group>}
