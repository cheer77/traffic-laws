import { useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { geometry, material, type MaterialName } from "./resources";

type Vec3=[number,number,number];
export interface PartProps {position?:Vec3;scale?:Vec3;rotation?:Vec3;mat?:MaterialName;cast?:boolean;}
export function Box({position,scale,rotation,mat="white",cast=true,rounded=false}:PartProps&{rounded?:boolean}){
 return <mesh geometry={rounded?geometry.rounded:geometry.box} material={material[mat]} position={position} scale={scale} rotation={rotation} castShadow={cast} receiveShadow dispose={null}/>;
}
export function Cylinder({position,scale,rotation,mat="chrome",cast=true}:PartProps){return <mesh geometry={geometry.cylinder} material={material[mat]} position={position} scale={scale} rotation={rotation} castShadow={cast} receiveShadow dispose={null}/>}
export function Ball({position,scale,mat="leaf",cast=true}:PartProps){return <mesh geometry={geometry.sphere} material={material[mat]} position={position} scale={scale} castShadow={cast} dispose={null}/>}

export interface InstanceTransform {position:Vec3;scale:Vec3;rotation?:Vec3;}
export function Batch({items,mat="white",shape="box",cast=true}:{items:InstanceTransform[];mat?:MaterialName;shape?:keyof typeof geometry;cast?:boolean}){
 const ref=useRef<THREE.InstancedMesh>(null);
 useEffect(()=>{const mesh=ref.current;return ()=>{mesh?.dispose()}},[]);
 useLayoutEffect(()=>{
  if(!ref.current)return;
  const object=new THREE.Object3D();
  items.forEach((item,index)=>{object.position.set(...item.position);object.scale.set(...item.scale);object.rotation.set(...(item.rotation??[0,0,0]));object.updateMatrix();ref.current!.setMatrixAt(index,object.matrix)});
  ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere();
 },[items]);
 return <instancedMesh ref={ref} args={[geometry[shape],material[mat],items.length]} castShadow={cast} receiveShadow dispose={null}/>;
}
