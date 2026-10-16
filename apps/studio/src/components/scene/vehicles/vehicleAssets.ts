import type { VehicleKind } from "@/types/studio";
import { SphereGeometry } from "three";
import { AssetBuilder, bodyWithWells, cabin, extrudedProfile, panelPatch, sideFace, type CabinSpec, type Face, type GeometryPart, type Point, type WheelLayout, type WindowMount } from "./assetBuilder";
import type { MaterialName } from "../resources";

export interface LabelMount {text:"POLICE"|"AMBULANCE"|"FIRE RESCUE";face:Face;row:number;}
export interface VehicleGeometry {
 parts:GeometryPart[];windows:WindowMount[];wheels:WheelLayout;labels:LabelMount[];
 length:number;halfWidth:number;beacon?:{roofY:number;z:number;width:number};
}

const carWheels:WheelLayout={radius:.37,width:.25,track:1,axles:[-1.36,1.38],centerY:.37,clearance:.09};
const suvWheels:WheelLayout={radius:.45,width:.27,track:1.035,axles:[-1.43,1.43],centerY:.45,clearance:.09};
const vanWheels:WheelLayout={radius:.44,width:.28,track:1.07,axles:[-1.77,1.78],centerY:.44,clearance:.09};
const truckWheels:WheelLayout={radius:.54,width:.32,track:1.16,axles:[-2.25,-.8,2.15],centerY:.54,clearance:.09};
const bikeWheels:WheelLayout={radius:.36,width:.18,track:0,axles:[-.83,.85],centerY:.36,clearance:.07};

function mirrors(builder:AssetBuilder,mat:MaterialName,spec:CabinSpec,halfWidth:number,y:number,z:number){
 const fraction=(y-.03-spec.baseY)/(spec.roofY-spec.baseY);
 const mountX=spec.baseHalfWidth+(spec.roofHalfWidth-spec.baseHalfWidth)*fraction-.003;
 for(const side of [-1,1]){
  builder.bar("dark",[side*mountX,y-.03,z],[side*(halfWidth+.19),y-.01,z+.025],.026);
  builder.box(mat,[side*(halfWidth+.19),y,z+.04],[.17,.13,.25],[0,0,0],true);
  builder.box("glass",[side*(halfWidth+.19),y,z-.088],[.12,.085,.009]);
 }
}

function lightbar(builder:AssetBuilder,roofY:number,z:number,width:number){
 builder.box("dark",[0,roofY+.037,z],[width,.074,.28],[0,0,0],true);
 for(const side of [-1,1])builder.box("blue",[side*width*.29,roofY+.125,z],[width*.37,.13,.24],[0,0,0],true);
 builder.box("chrome",[0,roofY+.12,z],[width*.18,.09,.24]);
 return {roofY,z,width};
}

function grille(builder:AssetBuilder,width:number,y:number,z:number){
 builder.box("dark",[0,y,z],[width,.2,.022]);
 for(const dy of [-.055,0,.055])builder.box("chrome",[0,y+dy,z+.014],[width*.87,.014,.014]);
}

function lighting(builder:AssetBuilder,length:number,halfWidth:number,y:number){
 for(const side of [-1,1]){
  const x=side*halfWidth*.61;
  builder.box("dark",[x,y,length/2+.012],[.42,.185,.045],[0,0,0],true);
  builder.box("headlight",[x,y,length/2+.038],[.34,.115,.018],[0,0,0],true);
  builder.box("dark",[x,y-.03,-length/2-.012],[.39,.17,.045],[0,0,0],true);
  builder.box("tail",[x,y-.03,-length/2-.038],[.31,.105,.018],[0,0,0],true);
  for(const end of [-1,1])builder.box("amber",[side*(halfWidth-.1),y,end*(length/2+.028)],[.115,.09,.035]);
 }
}

function carAsset(suv=false,police=false):VehicleGeometry{
 const builder=new AssetBuilder(),labels:LabelMount[]=[];
 const mat:MaterialName=police?"white":suv?"sage":"blue",wheels=suv?suvWheels:carWheels;
 const length=suv?4.7:4.5,halfWidth=suv?1.035:1,top=suv?1.19:1.03;
 bodyWithWells(builder,mat,length,halfWidth*2,suv?.38:.3,top,wheels);
 const cabSpec=suv?{baseY:1.16,roofY:1.98,front:1.12,rear:-1.82,roofFront:.45,roofRear:-1.17,baseHalfWidth:.98,roofHalfWidth:.84}:{baseY:1.01,roofY:1.64,front:1.08,rear:-1.43,roofFront:.38,roofRear:-.81,baseHalfWidth:.94,roofHalfWidth:.77};
 cabin(builder,mat,cabSpec,suv?3:2);
 for(const side of [-1,1]){
  const windshieldPoint=(u:number,v:number):Point=>[
   (u*2-1)*(cabSpec.baseHalfWidth+(cabSpec.roofHalfWidth-cabSpec.baseHalfWidth)*v),
   cabSpec.baseY+(cabSpec.roofY-cabSpec.baseY)*v+.006,
   cabSpec.front+(cabSpec.roofFront-cabSpec.front)*v+.009,
  ];
  builder.bar("dark",windshieldPoint(side>0?.55:.18,.18),windshieldPoint(side>0?.83:.46,.28),.009);
 }
 const bumperZ=length/2;
 builder.box("dark",[0,.4,bumperZ],[halfWidth*1.84,.16,.13],[0,0,0],true);
 builder.box("dark",[0,.4,-bumperZ],[halfWidth*1.87,.16,.13],[0,0,0],true);
 grille(builder,.88,.77,bumperZ+.008);
 builder.box("white",[0,.49,-bumperZ-.07],[.39,.115,.015]);
 mirrors(builder,mat,cabSpec,halfWidth,suv?1.39:1.26,.67);
 lighting(builder,length,halfWidth,suv?1:.81);
 for(const side of [-1,1]){
  for(const z of [-.66,.52])builder.box("chrome",[side*(halfWidth+.004),top-.085,z],[.022,.035,.19]);
  const seam=suv?.07:-.17;
  builder.surface("dark",panelPatch(sideFace(side,halfWidth,seam-.01,seam+.01,.34,top-.03),0,1,0,1));
  if(suv)builder.box("dark",[side*.68,2.025,-.3],[.045,.09,1.57],[0,0,0],true);
  if(police){
   const stripe=sideFace(side,halfWidth,-.77,.79,.64,.99);
   builder.surface("police",panelPatch(stripe,0,1,0,1));
   labels.push({text:"POLICE",row:0,face:panelPatch(stripe,.15,.85,.05,.92,.008)});
  }
 }
 let beacon:VehicleGeometry["beacon"];
 if(police){
  const hood:Face=[[-.83,top+.004,2.04],[.83,top+.004,2.04],[.83,top+.004,1.19],[-.83,top+.004,1.19]];
  builder.surface("police",hood);labels.push({text:"POLICE",row:0,face:panelPatch(hood,.09,.91,.2,.64)});
  beacon=lightbar(builder,1.64,-.12,1.12);
 }
 return {parts:builder.finish(),windows:builder.windows,wheels,labels,length,halfWidth,beacon};
}

function ambulanceAsset():VehicleGeometry{
 const builder=new AssetBuilder(),labels:LabelMount[]=[],length=5.8,halfWidth=1.08;
 bodyWithWells(builder,"white",length,halfWidth*2,.34,1.13,vanWheels);
 builder.add("white",extrudedProfile([[1.09,-2.9],[2.51,-2.9],[2.65,-2.75],[2.65,.65],[2.53,.8],[1.09,.8]],halfWidth*2));
 const cabSpec={baseY:1.1,roofY:2.35,front:2.8,rear:.8,roofFront:1.9,roofRear:.8,baseHalfWidth:1.04,roofHalfWidth:.92};
 cabin(builder,"white",cabSpec,1,false);
 builder.box("dark",[0,.48,2.91],[2.02,.2,.14],[0,0,0],true);
 builder.box("dark",[0,.45,-2.91],[2.03,.18,.14],[0,0,0],true);
 grille(builder,1.02,.89,2.91);
 lighting(builder,length,halfWidth,.89);
 mirrors(builder,"white",cabSpec,1.06,1.59,1.67);
 for(const side of [-1,1]){
  builder.surface("gold",panelPatch(sideFace(side,halfWidth,-2.72,.67,1.18,1.37),0,1,0,1));
  builder.surface("teal",panelPatch(sideFace(side,halfWidth,-2.72,.67,1.12,1.16),0,1,0,1));
  const panel=sideFace(side,halfWidth,-2.55,.48,1.4,2.5);
  labels.push({text:"AMBULANCE",row:1,face:panelPatch(panel,.12,.88,.56,.932)});
  const x=side*(halfWidth+.008),z=-1.0;
  builder.box("teal",[x,1.7,z],[.016,.52,.15]);builder.box("teal",[x,1.7,z],[.017,.15,.52]);
  builder.box("chrome",[side*1.075,1.25,.41],[.019,.065,.22]);
 }
 const back:Face=[[halfWidth,1.1,-2.9],[-halfWidth,1.1,-2.9],[-halfWidth,2.51,-2.9],[halfWidth,2.51,-2.9]];
 builder.window(back,.08,.44,.4,.86);builder.window(back,.56,.92,.4,.86);
 builder.box("chrome",[0,1.8,-2.908],[.016,1.36,.014]);
 labels.push({text:"AMBULANCE",row:1,face:panelPatch(back,.09,.91,.08,.303,.008)});
 const beacon=lightbar(builder,2.65,.16,1.28);
 return {parts:builder.finish(),windows:builder.windows,wheels:vanWheels,labels,length,halfWidth,beacon};
}

function fireAsset():VehicleGeometry{
 const builder=new AssetBuilder(),labels:LabelMount[]=[],length=7,halfWidth=1.18;
 bodyWithWells(builder,"red",length,halfWidth*2,.39,1.34,truckWheels);
 builder.add("red",extrudedProfile([[1.28,-3.4],[2.17,-3.4],[2.29,-3.28],[2.29,.5],[2.2,.64],[1.28,.64]],halfWidth*2));
 const cabSpec={baseY:1.28,roofY:2.61,front:3.4,rear:.64,roofFront:2.65,roofRear:.64,baseHalfWidth:1.145,roofHalfWidth:1.02};
 cabin(builder,"red",cabSpec,2,false);
 mirrors(builder,"red",cabSpec,1.16,1.82,2.66);
 builder.box("chrome",[0,.67,3.5],[2.19,.21,.13],[0,0,0],true);
 builder.box("dark",[0,.57,-3.5],[2.2,.2,.13],[0,0,0],true);
 grille(builder,1.18,1.02,3.51);
 lighting(builder,length,halfWidth,1.12);
 for(const side of [-1,1]){
  const panel=sideFace(side,halfWidth,-3.23,.46,1.37,2.19);
  labels.push({text:"FIRE RESCUE",row:2,face:panelPatch(panel,.23,.77,.57,.97,.008)});
  for(let index=0;index<3;index++){
   const u=index/3+.025;builder.surface("chrome",panelPatch(panel,u,u+.29,.03,.54));
   for(let row=0;row<5;row++)builder.surface("roof",panelPatch(panel,u,u+.29,.08+row*.09,.09+row*.09,.005));
  }
  builder.surface("white",panelPatch(sideFace(side,halfWidth,-3.25,3.25,1.2,1.27),0,1,0,1));
  builder.box("chrome",[side*.58,2.42,-1.35],[.07,.08,3.72]);
  for(const z of [-2.48,-.05])builder.box("dark",[side*.58,2.34,z],[.17,.12,.18]);
 }
 for(let index=0;index<10;index++)builder.box("chrome",[0,2.42,-3.08+index*.39],[1.16,.047,.054]);
 const back:Face=[[halfWidth,1.3,-3.4],[-halfWidth,1.3,-3.4],[-halfWidth,2.17,-3.4],[halfWidth,2.17,-3.4]];
 labels.push({text:"FIRE RESCUE",row:2,face:panelPatch(back,.08,.92,.46,.835)});
 const beacon=lightbar(builder,2.61,1.65,1.42);
 return {parts:builder.finish(),windows:builder.windows,wheels:truckWheels,labels,length,halfWidth,beacon};
}

function motorcycleAsset():VehicleGeometry{
 const builder=new AssetBuilder();
 builder.bar("dark",[0,.49,-.8],[0,.66,.15],.055);
 for(const side of [-1,1]){
  builder.bar("chrome",[side*.14,bikeWheels.centerY,.85],[side*.14,1.31,.53],.032);
  builder.bar("dark",[side*.12,bikeWheels.centerY,-.83],[side*.13,.93,-.34],.035);
  builder.bar("dark",[side*.34,.47,-.18],[side*.14,.55,-.18],.025);
 }
 builder.box("chrome",[0,.61,-.03],[.45,.43,.46],[0,0,0],true);
 builder.ball("gold",[0,.95,.13],[.28,.25,.39]);
 builder.box("rubber",[0,1.08,-.48],[.44,.15,.73],[0,0,0],true);
 builder.bar("dark",RIDER_POINTS.rightGrip,RIDER_POINTS.leftGrip,.03);
 for(const side of [-1,1]){
  builder.bar("chrome",[side*.3,1.35,.52],[side*.43,1.57,.57],.014);
  builder.box("dark",[side*.43,1.6,.57],[.19,.12,.055],[0,side*.16,0],true);
  builder.box("glass",[side*.43,1.6,.537],[.145,.077,.009],[0,side*.16,0]);
 }
 builder.bar("chrome",[0,1.31,.53],[0,.92,.65],.04);
 builder.bar("chrome",[-.28,.34,-.72],[-.28,.38,-.12],.065);
 builder.box("tail",[0,1.02,-.95],[.24,.09,.04]);
 builder.box("headlight",[0,1.13,.79],[.27,.23,.08],[.18,0,0],true);
 for(const axle of bikeWheels.axles){
  const points:Array<[number,number]>=[];
  for(let step=0;step<=12;step++){const angle=step/12*Math.PI;points.push([bikeWheels.centerY+.425*Math.sin(angle),axle+.425*Math.cos(angle)])}
  for(let step=12;step>=0;step--){const angle=step/12*Math.PI;points.push([bikeWheels.centerY+.399*Math.sin(angle),axle+.399*Math.cos(angle)])}
  builder.add("gold",extrudedProfile(points,.23));
 }
 return {parts:builder.finish(),windows:[],wheels:bikeWheels,labels:[],length:2.2,halfWidth:.35};
}

export const RIDER_POINTS={
 hip:[0,1.26,-.45] as Point,shoulders:[0,1.82,-.18] as Point,
 helmet:[0,2.15,-.09] as Point,
 leftGrip:[.35,1.35,.52] as Point,rightGrip:[-.35,1.35,.52] as Point,
};

function riderGeometry():GeometryPart[]{
 const builder=new AssetBuilder();
 builder.box("pants",RIDER_POINTS.hip,[.39,.23,.31],[.12,0,0],true);
 builder.bar("riderJacket",[0,1.36,-.4],RIDER_POINTS.shoulders,.225);
 builder.bar("skin",[0,1.86,-.12],[0,2.04,-.09],.075);
 builder.ball("helmet",RIDER_POINTS.helmet,[.235,.265,.24]);
 for(const side of [-1,1]){
  const shoulder:Point=[side*.22,1.82,-.18],elbow:Point=[side*.35,1.57,.12],hand=side>0?RIDER_POINTS.leftGrip:RIDER_POINTS.rightGrip;
  builder.bar("riderJacket",shoulder,elbow,.085);builder.ball("riderJacket",elbow,[.085,.085,.085]);
  builder.bar("riderJacket",elbow,hand,.068);builder.ball("rubber",hand,[.072,.07,.085]);
  const hip:Point=[side*.16,1.25,-.45],knee:Point=[side*.4,.91,.03],ankle:Point=[side*.34,.5,-.22];
  builder.bar("pants",hip,knee,.1);builder.ball("pants",knee,[.102,.1,.1]);builder.bar("pants",knee,ankle,.08);
  builder.box("rubber",[side*.34,.46,-.12],[.18,.16,.33],[0,0,0],true);
 }
 // Визор — участок поверхности шлема, а не отдельный висящий прямоугольник.
 const visor=new SphereGeometry(1,12,4,0,Math.PI,Math.PI*.36,Math.PI*.27);
 visor.scale(.239,.269,.244);visor.translate(...RIDER_POINTS.helmet);builder.add("vehicleGlass",visor);
 return builder.finish();
}

export const VEHICLE_GEOMETRY:Record<VehicleKind,VehicleGeometry>={
 sedan:carAsset(),suv:carAsset(true),police:carAsset(false,true),ambulance:ambulanceAsset(),fire:fireAsset(),motorcycle:motorcycleAsset(),
};
export const RIDER_GEOMETRY=riderGeometry();
