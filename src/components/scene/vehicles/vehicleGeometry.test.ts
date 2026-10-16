import { describe,expect,it } from "vitest";
import * as THREE from "three";
import { VEHICLE_GEOMETRY, RIDER_GEOMETRY, RIDER_POINTS } from "./vehicleAssets";
import { faceNormal } from "./assetBuilder";
import { LABEL_ATLAS_SIZE, LABEL_ROWS } from "./labelLayout";

describe("vehicle surface alignment",()=>{
 it.each(Object.entries(VEHICLE_GEOMETRY))("%s: every window follows its actual body plane",(_,asset)=>{
  expect(asset.wheels.centerY-asset.wheels.radius).toBeCloseTo(0,7);
  for(const window of asset.windows){
   const normal=faceNormal(window.host),origin=new THREE.Vector3(...window.host[0]);
   expect(faceNormal(window.vertices).dot(normal)).toBeCloseTo(1,7);
   for(const vertex of window.vertices){
    const gap=new THREE.Vector3(...vertex).sub(origin).dot(normal);
    expect(gap).toBeCloseTo(.004,7);
   }
  }
 });

 it.each(Object.entries(VEHICLE_GEOMETRY).filter(([kind])=>kind!=="motorcycle"))("%s: body geometry leaves the entire tire envelope clear",(_,asset)=>{
  const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  const meshes=asset.parts.map(part=>new THREE.Mesh(part.geometry,material));
  const {radius,centerY,axles}=asset.wheels;
  for(const axle of axles)for(let step=0;step<32;step++){
   const angle=step/32*Math.PI*2,y=centerY+Math.sin(angle)*(radius+.015),z=axle+Math.cos(angle)*(radius+.015);
   const ray=new THREE.Raycaster(new THREE.Vector3(-asset.halfWidth-.1,y,z),new THREE.Vector3(1,0,0),0,asset.halfWidth*2+.2);
   expect(ray.intersectObjects(meshes,false),`axle ${axle}, angle ${angle}`).toHaveLength(0);
  }
  material.dispose();
 });

 it("all generated vehicle parts have finite normals and stay within a lightweight budget",()=>{
  const parts=[...Object.values(VEHICLE_GEOMETRY).flatMap(asset=>asset.parts),...RIDER_GEOMETRY];
  for(const part of parts){
   const positions=part.geometry.getAttribute("position"),normals=part.geometry.getAttribute("normal");
   expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
   expect(Array.from(normals.array).every(Number.isFinite)).toBe(true);
   expect(positions.count/3).toBeLessThan(5000);
  }
 });
});

describe("special vehicle markings and motorcycle rider",()=>{
 it.each(["police","ambulance","fire"] as const)("%s has outward-facing readable label surfaces and a roof-mounted lightbar",kind=>{
  const asset=VEHICLE_GEOMETRY[kind];
  expect(asset.labels.length).toBeGreaterThanOrEqual(3);
  expect(asset.beacon).toBeDefined();
  for(const label of asset.labels){
   expect(label.text).toBe(kind==="police"?"POLICE":kind==="ambulance"?"AMBULANCE":"FIRE RESCUE");
   expect(LABEL_ROWS[label.row].text).toBe(label.text);
   const normal=faceNormal(label.face);
   const center=label.face.reduce((sum,point)=>sum.add(new THREE.Vector3(...point)),new THREE.Vector3()).multiplyScalar(.25);
   expect(normal.dot(center)).toBeGreaterThan(0);
   const width=new THREE.Vector3(...label.face[1]).distanceTo(new THREE.Vector3(...label.face[0]));
   const height=new THREE.Vector3(...label.face[3]).distanceTo(new THREE.Vector3(...label.face[0]));
   expect(width/height).toBeCloseTo(LABEL_ROWS[label.row].width/64,0);
  }
 });
 it("uses one small label atlas",()=>expect(LABEL_ATLAS_SIZE[0]*LABEL_ATLAS_SIZE[1]).toBeLessThanOrEqual(512*256));
 it("seats the rider above the saddle and places both gloves at the handlebar ends",()=>{
  expect(RIDER_POINTS.hip[1]).toBeGreaterThan(1.15);
  expect(RIDER_POINTS.helmet[1]).toBeGreaterThan(RIDER_POINTS.shoulders[1]);
  const gloves=RIDER_GEOMETRY.find(part=>part.material==="rubber")!;
  const rayMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(gloves.geometry,rayMaterial);
  for(const grip of [RIDER_POINTS.leftGrip,RIDER_POINTS.rightGrip]){
   const ray=new THREE.Raycaster(new THREE.Vector3(grip[0],grip[1],grip[2]+.2),new THREE.Vector3(0,0,-1),0,.4);
   expect(ray.intersectObject(mesh)).not.toHaveLength(0);
  }
  rayMaterial.dispose();
 });
});
