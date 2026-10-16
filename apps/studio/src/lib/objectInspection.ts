import * as THREE from "three";
import type { Inspection } from "@/types/studio";

export function inspectObject(root:THREE.Object3D):Inspection{
 root.updateWorldMatrix(true,true);
 const bounds=new THREE.Box3(),partBounds=new THREE.Box3(),matrix=new THREE.Matrix4();
 const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<string>();
 let triangles=0;
 root.traverse(object=>{
  const mesh=object as THREE.Mesh;if(!mesh.isMesh||mesh.userData.helper)return;
  const geometry=mesh.geometry;geometries.add(geometry);
  if(!geometry.boundingBox)geometry.computeBoundingBox();
  const instanced=mesh as THREE.InstancedMesh,count=instanced.isInstancedMesh?instanced.count:1;
  triangles+=(geometry.index?.count??geometry.getAttribute("position").count)/3*count;
  for(let i=0;i<count;i++){
   if(instanced.isInstancedMesh){instanced.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld)}else matrix.copy(mesh.matrixWorld);
   partBounds.copy(geometry.boundingBox!).applyMatrix4(matrix);bounds.union(partBounds);
  }
  for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
   const standard=mat as THREE.MeshStandardMaterial;
   materials.add(`${mat.name||mat.type}${standard.color?` #${standard.color.getHexString()}`:""}`);
  }
 });
 if(bounds.isEmpty())bounds.setFromCenterAndSize(root.getWorldPosition(new THREE.Vector3()),new THREE.Vector3());
 return {id:root.name,position:root.position.toArray(),rotation:[root.rotation.x,root.rotation.y,root.rotation.z].map(THREE.MathUtils.radToDeg),scale:root.scale.toArray(),
  min:bounds.min.toArray(),max:bounds.max.toArray(),size:bounds.getSize(new THREE.Vector3()).toArray(),triangles,geometries:geometries.size,materials:[...materials]};
}
