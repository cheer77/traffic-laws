"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { useStudioStore } from "@/stores/useStudioStore";

// Own the render call so high-refresh displays and OrbitControls also obey the cap.
// Timers exist only while animating or completing a requested frame, never in idle.
export function RenderMonitor({active=true}:{active?:boolean}){
 const sample=useRef({frames:0,duration:0,cpu:0,last:0});
 const wake=useRef<ReturnType<typeof setTimeout>|null>(null),idle=useRef<ReturnType<typeof setTimeout>|null>(null);
 const invalidate=useThree(s=>s.invalidate),regress=useThree(s=>s.performance.regress);
 const animated=useStudioStore(s=>s.selectedId===`vehicle-${s.active}`&&(s.preview||s.visible[s.active])&&(s.wheelPreview||s.beacon||s.signal!=="off"));
 const limit=useStudioStore(s=>s.frameLimit);
 useEffect(()=>{
  sample.current={frames:0,duration:0,cpu:0,last:0};
  if(active)invalidate();else useStudioStore.getState().setRendering(false);
  return ()=>{if(wake.current)clearTimeout(wake.current);if(idle.current)clearTimeout(idle.current);wake.current=null;idle.current=null};
 },[active,animated,limit,invalidate]);
 useFrame(({gl,scene,camera})=>{
  if(!active)return;
  const now=performance.now(),s=sample.current,interval=1000/limit;
  const request=(delay:number)=>{if(wake.current===null)wake.current=setTimeout(()=>{wake.current=null;invalidate()},Math.max(0,delay))};
  if(s.last&&now-s.last<interval-.5){request(interval-(now-s.last)-1);return}
  const gap=now-s.last,start=performance.now();
  gl.render(scene,camera);
  const cpu=performance.now()-start;
  if(s.last&&gap<200){s.frames++;s.duration+=gap;s.cpu+=cpu}
  s.last=now;
  const store=useStudioStore.getState();
  if(!store.rendering)store.setRendering(true);
  const metrics=()=>({calls:gl.info.render.calls,triangles:gl.info.render.triangles,geometries:gl.info.memory.geometries,textures:gl.info.memory.textures,cpuTime:s.frames?s.cpu/s.frames:cpu});
  if(s.duration>=750){
   const frameTime=s.duration/s.frames;
   store.setMetrics({fps:Math.round(1000/frameTime),frameTime,...metrics()});
   if(frameTime>interval*1.35)regress();
   s.frames=0;s.duration=0;s.cpu=0;
  }
  if(idle.current===null){
   const settle=()=>{
    const remaining=220-(performance.now()-s.last);
    if(remaining>0){idle.current=setTimeout(settle,remaining);return}
    idle.current=null;
    const state=useStudioStore.getState();state.setRendering(false);state.setMetrics({...state.metrics,...metrics()});
   };
   idle.current=setTimeout(settle,220);
  }
  if(animated)request(interval-(performance.now()-now)-2);
 },1);
 return null;
}
