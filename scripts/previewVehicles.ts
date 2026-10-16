import * as THREE from "three";
import sharp from "sharp";
import { VEHICLES } from "../src/lib/studioConfig";
import { LABEL_ROWS } from "../src/components/scene/vehicles/labelLayout";
import { inspectObject } from "../src/lib/objectInspection";

interface PreviewAsset {id:string;name:string;rotation:number;}

// Программный z-buffer для проверки именно геометрии без браузера/WebGL.
// Не воспроизводит PBR-освещение Three.js и не измеряет реальный FPS.
export async function previewVehicles(root:THREE.Object3D,path:string,rear=false,assets:PreviewAsset[]=VEHICLES.map(asset=>({...asset,id:`vehicle-${asset.id}`}))){
 const width=760,height=420,totalWidth=width*2,totalHeight=height*Math.ceil(assets.length/2);
 const pixels=Buffer.alloc(totalWidth*totalHeight*4),depth=new Float32Array(totalWidth*totalHeight).fill(Infinity);
 const light=new THREE.Vector3(-.3,.8,.6).normalize();
 for(let y=0;y<totalHeight;y++)for(let x=0;x<totalWidth;x++){
  const index=(y*totalWidth+x)*4;const rgb=x<width?[233,237,231]:[237,240,233];
  pixels[index]=rgb[0];pixels[index+1]=rgb[1];pixels[index+2]=rgb[2];pixels[index+3]=255;
 }
 const atlasSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256">${LABEL_ROWS.map((row,i)=>`<text x="256" y="${i*64+33}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="52" font-weight="bold" fill="${row.color}" textLength="${row.width-16}" lengthAdjust="spacingAndGlyphs">${row.text}</text>`).join("")}</svg>`;
 const atlas=await sharp(Buffer.from(atlasSvg)).ensureAlpha().raw().toBuffer();
 root.updateMatrixWorld(true);
 for(const [index,asset] of assets.entries()){
  const model=root.getObjectByName(asset.id)!;
  const bounds=inspectObject(model);
  const span=Math.max(3,asset.id.startsWith("vehicle-")?Math.max(...bounds.size)*1.15:Math.hypot(...bounds.size)*1.05),halfH=span*.5,halfW=halfH*width/height;
  const center=new THREE.Vector3().fromArray(bounds.min).add(new THREE.Vector3().fromArray(bounds.max)).multiplyScalar(.5);
  const camera=new THREE.OrthographicCamera(-halfW,halfW,halfH,-halfH,.1,240);
  const offset=new THREE.Vector3(rear?-6:6,3.7,rear?-7:7).applyAxisAngle(new THREE.Vector3(0,1,0),asset.rotation);
  camera.position.copy(center).add(offset.multiplyScalar(Math.max(1,span/5)));camera.lookAt(center);camera.updateMatrixWorld();camera.updateProjectionMatrix();
  const project=(p:THREE.Vector3)=>{const n=p.clone().project(camera);return {x:(n.x+1)*width/2+index%2*width,y:(1-n.y)*height/2+Math.floor(index/2)*height,z:n.z}};
  model.traverseVisible(object=>{
   const mesh=object as THREE.Mesh;if(!mesh.isMesh||mesh.userData.helper)return;
   const instanced=mesh as THREE.InstancedMesh;
   for(let instance=0;instance<(instanced.isInstancedMesh?instanced.count:1);instance++){
   const matrix=mesh.matrixWorld.clone();
   if(instanced.isInstancedMesh){const local=new THREE.Matrix4();instanced.getMatrixAt(instance,local);matrix.multiply(local)}
   const material=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;
   const color=(material as THREE.MeshStandardMaterial).color??new THREE.Color("white");
   const positions=mesh.geometry.getAttribute("position"),uvs=mesh.geometry.getAttribute("uv"),indices=mesh.geometry.index;
   const normalMatrix=new THREE.Matrix3().getNormalMatrix(matrix),normals=mesh.geometry.getAttribute("normal");
   const textured=mesh.name.startsWith("labels-");
   for(let i=0;i<(indices?.count??positions.count);i+=3){
    const ids=[0,1,2].map(j=>indices?indices.getX(i+j):i+j);
    const vertices=ids.map(id=>new THREE.Vector3().fromBufferAttribute(positions,id).applyMatrix4(matrix));
    const normal=vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).normalize();
    if(normal.dot(camera.position.clone().sub(vertices[0]))<=0)continue;
    const smooth=ids.map(id=>new THREE.Vector3().fromBufferAttribute(normals,id).applyMatrix3(normalMatrix));
    const shade=.65+.35*Math.max(0,smooth[0].add(smooth[1]).add(smooth[2]).normalize().dot(light));
    const hex=color.clone().multiplyScalar(shade).getHex(),rgb=[hex>>16&255,hex>>8&255,hex&255];
    const p=vertices.map(project),uv=ids.map(id=>[uvs?.getX(id)??0,uvs?.getY(id)??0]);
    const minX=Math.max(index%2*width,Math.floor(Math.min(...p.map(v=>v.x)))),maxX=Math.min((index%2+1)*width-1,Math.ceil(Math.max(...p.map(v=>v.x))));
    const minY=Math.max(Math.floor(index/2)*height,Math.floor(Math.min(...p.map(v=>v.y)))),maxY=Math.min((Math.floor(index/2)+1)*height-1,Math.ceil(Math.max(...p.map(v=>v.y))));
    const denominator=(p[1].y-p[2].y)*(p[0].x-p[2].x)+(p[2].x-p[1].x)*(p[0].y-p[2].y);
    if(Math.abs(denominator)<1e-8)continue;
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
     const a=((p[1].y-p[2].y)*(x+.5-p[2].x)+(p[2].x-p[1].x)*(y+.5-p[2].y))/denominator;
     const b=((p[2].y-p[0].y)*(x+.5-p[2].x)+(p[0].x-p[2].x)*(y+.5-p[2].y))/denominator,c=1-a-b;
     if(a<0||b<0||c<0)continue;
     const z=p[0].z*a+p[1].z*b+p[2].z*c,pixel=y*totalWidth+x;
     if(z>=depth[pixel])continue;
     const base=pixel*4;
     if(textured){
      const u=uv[0][0]*a+uv[1][0]*b+uv[2][0]*c,v=uv[0][1]*a+uv[1][1]*b+uv[2][1]*c;
      const sample=(Math.min(255,Math.max(0,Math.floor((1-v)*256)))*512+Math.min(511,Math.max(0,Math.floor(u*512))))*4;
      if(atlas[sample+3]<100)continue;
      pixels[base]=atlas[sample];pixels[base+1]=atlas[sample+1];pixels[base+2]=atlas[sample+2];
     }else{pixels[base]=rgb[0];pixels[base+1]=rgb[1];pixels[base+2]=rgb[2]}
     depth[pixel]=z;
    }
   }
   }
  });
 }
 const captions=`<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}">${assets.map((asset,i)=>`<text x="${i%2*width+28}" y="${Math.floor(i/2)*height+32}" font-family="sans-serif" font-size="17" fill="#405045">${asset.name}</text>`).join("")}</svg>`;
 await sharp(pixels,{raw:{width:totalWidth,height:totalHeight,channels:4}}).composite([{input:Buffer.from(captions)}]).png().toFile(path);
}
