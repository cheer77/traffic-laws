export type Approach = "north" | "south" | "east" | "west";
export type Vec3 = [number, number, number];

// World +Z points south. One lane per direction; the right vector is
// (-direction.z, 0, direction.x), not screen-right.
export const ROAD = {
 width:9.6, laneWidth:4.8, halfLength:33, surfaceY:0,
 markingY:.012, sidewalkY:.16, curbWidth:.24,
 conflictHalfExtent:4.8, crossingCenter:7.5, crossingDepth:2.1, stopDistance:9.2,
} as const;
export const APPROACHES:Approach[]=["south","north","east","west"];
export const DIRECTIONS:Record<Approach,Vec3>={south:[0,0,-1],north:[0,0,1],east:[-1,0,0],west:[1,0,0]};
export function lanePoint(approach:Approach,distance:number,outbound=false):Vec3{
 const [dx,,dz]=DIRECTIONS[approach],offset=ROAD.laneWidth/2*(outbound?-1:1);
 return [-dx*distance-dz*offset,ROAD.surfaceY,-dz*distance+dx*offset];
}
export function laneGeometry(approach:Approach){
 const direction=DIRECTIONS[approach];
 return {direction,rotation:Math.atan2(direction[0],direction[2]),
  entry:lanePoint(approach,ROAD.halfLength),stop:lanePoint(approach,ROAD.stopDistance),
  exit:lanePoint(approach,ROAD.halfLength,true),laneCenter:ROAD.laneWidth/2,
  boundaries:[-ROAD.width/2,ROAD.width/2] as const,
  conflictArea:{min:[-ROAD.conflictHalfExtent,0,-ROAD.conflictHalfExtent] as Vec3,max:[ROAD.conflictHalfExtent,0,ROAD.conflictHalfExtent] as Vec3}};
}
