import { describe,expect,it } from "vitest";
import { APPROACHES, laneGeometry, lanePoint, ROAD } from "./roadGeometry";
import { VEHICLES } from "./studioConfig";
import { LIGHTS, SIGNS } from "./sceneAssets";
import { crosswalks,roadDashes,stopLines } from "@/components/scene/roads/IntersectionRoad";
import { SIGN_PARTS,YIELD_VERTICES } from "@/components/scene/signs/signAssets";

describe("road library geometry",()=>{
 it.each(APPROACHES)("%s entry is on the driver's right and opposite to its exit",approach=>{
  const lane=laneGeometry(approach),[dx,,dz]=lane.direction,[x,,z]=lane.entry;
  expect(x*-dz+z*dx).toBeCloseTo(ROAD.laneWidth/2);
  expect(x*dx+z*dz).toBe(-ROAD.halfLength);
  expect(lane.exit[0]*-dz+lane.exit[2]*dx).toBe(-ROAD.laneWidth/2);
  const middle=lanePoint(approach,12);
  expect((middle[0]-x)*dz-(middle[2]-z)*dx).toBeCloseTo(0);
 });
 it("places every vehicle on its incoming lane, parallel to it",()=>{
  for(const v of VEHICLES){
   const dx=Math.sin(v.rotation),dz=Math.cos(v.rotation),[x,,z]=v.position;
   expect(x*-dz+z*dx).toBeCloseTo(ROAD.laneWidth/2);
   expect(x*dx+z*dz).toBeLessThan(-ROAD.stopDistance);
  }
 });
 it("keeps crossing stripes, stop lines and center dashes disjoint",()=>{
  const markings=[...crosswalks,...stopLines,...roadDashes];
  for(let i=0;i<markings.length;i++)for(let j=i+1;j<markings.length;j++){
   const a=markings[i],b=markings[j];
   const overlapX=Math.abs(a.position[0]-b.position[0])<(a.scale[0]+b.scale[0])/2-.001;
   const overlapZ=Math.abs(a.position[2]-b.position[2])<(a.scale[2]+b.scale[2])/2-.001;
   expect(overlapX&&overlapZ,`markings ${i}/${j}`).toBe(false);
  }
 });
 it("faces traffic devices toward approaching drivers",()=>{
  for(const a of [...LIGHTS,...SIGNS.filter(s=>s.id!=="sign-stop")]){
   const forward=[Math.sin(a.rotation),Math.cos(a.rotation)];
   expect(forward[0]*a.position[0]+forward[1]*a.position[2]).toBeGreaterThan(9);
  }
 });
 it("uses a centered, inverted equilateral yield sign",()=>{
  const [a,b,c]=YIELD_VERTICES;
  expect(a[1]).toBe(b[1]);expect(c[1]).toBeLessThan(a[1]);expect(c[0]).toBe(0);
  expect(Math.hypot(a[0]-c[0],a[1]-c[1])).toBeCloseTo(b[0]-a[0],2);
  const backing=SIGN_PARTS.yield.find(part=>part.material==="chrome")!.geometry;
  backing.computeBoundingBox();expect(backing.boundingBox!.max.z).toBeLessThan(.077);
 });
});
