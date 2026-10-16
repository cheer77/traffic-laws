import * as THREE from "three";
import { AssetBuilder } from "../vehicles/assetBuilder";

function polygon(points:Array<[number,number]>,scale:number,z:number){
 const shape=new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(x*scale,y*scale)));
 const geometry=new THREE.ShapeGeometry(shape);geometry.translate(0,2.65,z);return geometry;
}
export const YIELD_VERTICES:Array<[number,number]>=[[-.55,.32],[.55,.32],[0,-.632]];
function signAsset(kind:"yield"|"priority"|"stop"){
 const b=new AssetBuilder();
 b.bar("chrome",[0,.16,0],[0,2.88,0],.035);
 b.box("dark",[0,.19,0],[.19,.06,.19]);
 for(const y of [2.42,2.84])b.box("chrome",[0,y,.015],[.22,.055,.06]);
 const points=kind==="yield"?YIELD_VERTICES:kind==="priority"?[[0,.57],[.57,0],[0,-.57],[-.57,0]] as Array<[number,number]>:
  Array.from({length:8},(_,i)=>[Math.sin(Math.PI/8+i*Math.PI/4)*.58,Math.cos(Math.PI/8+i*Math.PI/4)*.58] as [number,number]);
 const backing=new THREE.ExtrudeGeometry(new THREE.Shape(points.map(p=>new THREE.Vector2(...p))),{depth:.035,bevelEnabled:false,steps:1});
 backing.translate(0,2.65,.04);b.add("chrome",backing);
 b.add(kind==="yield"?"signRed":"white",polygon(points,1,.077));
 b.add(kind==="yield"?"white":kind==="stop"?"signRed":"dark",polygon(points,kind==="yield"?.77:.9,.080));
 if(kind==="priority"){
  b.add("signYellow",polygon(points,.79,.083));
  b.box("chrome",[0,1.98,.065],[.71,.49,.04]);b.box("white",[0,1.98,.088],[.66,.44,.009]);
  b.box("dark",[0,1.98,.096],[.43,.035,.006]);b.box("dark",[0,1.98,.101],[.075,.32,.006]);
 }
 if(kind==="stop"){
  // Vector glyphs stay sharp without loading a font or a texture.
  const glyphs=[[[1,1],[0,1],[0,.5],[1,.5],[1,0],[0,0]],[[0,1],[1,1],[.5,1],[.5,0]],[[0,0],[0,1],[1,1],[1,0],[0,0]],[[0,0],[0,1],[1,1],[1,.5],[0,.5]]];
  glyphs.forEach((glyph,index)=>{for(let i=1;i<glyph.length;i++){
   const [ax,ay]=glyph[i-1],[bx,by]=glyph[i],x=-.36+index*.19;
   b.bar("white",[x+ax*.13,2.5+ay*.29,.089],[x+bx*.13,2.5+by*.29,.089],.015);
  }});
 }
 return b.finish();
}
export const SIGN_PARTS={yield:signAsset("yield"),priority:signAsset("priority"),stop:signAsset("stop")};
