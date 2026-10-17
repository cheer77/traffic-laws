"use client";
import { SceneEnvironment } from "@traffic-laws/scene-engine/react";
import { useComposerStore } from "@/stores/useComposerStore";
import { TransformGizmo } from "../composer/TransformGizmo";
import { AdaptiveDpr } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useRef, type ReactNode } from "react";
import { QUALITY } from "@/lib/studioConfig";
import { SCENE_ASSET_BY_ID } from "@/lib/sceneAssets";
import { useStudioStore } from "@/stores/useStudioStore";
import { usePageActive } from "@/hooks/usePageActive";
import { RenderMonitor } from "@/components/debug/RenderMonitor";
import { SceneDebug } from "@/components/debug/SceneDebug";
import { StudioCamera } from "./camera/StudioCamera";
import { INITIAL_CAMERA_POSITION } from "./camera/cameraConfig";
import { SceneObjects } from "./SceneObjects";
import { Box } from "./Primitives";

class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<div className="scene-error"><strong>Не вдалося відкрити 3D-сцену</strong><p>Перевірте підтримку WebGL та апаратне прискорення браузера.</p><button onClick={()=>window.location.reload()}>Спробувати знову</button></div>:this.props.children}
}
function SceneContents({active}:{active:boolean}){
 const definition=useComposerStore(s=>s.scene),mode=useComposerStore(s=>s.mode),tool=useComposerStore(s=>s.tool);
 const visible=useStudioStore(s=>s.visible),layers=useStudioStore(s=>s.layers);
 const quality=useStudioStore(s=>s.quality),sun=useStudioStore(s=>s.sun),grid=useStudioStore(s=>s.grid);
 const preview=useStudioStore(s=>s.preview),selected=useStudioStore(s=>s.selectedId),shadows=useStudioStore(s=>s.shadows),lighting=useStudioStore(s=>s.lighting);
 const profile=QUALITY[quality],shadowDirty=useRef(true);
 const shadowExtent=preview?Math.max(5,SCENE_ASSET_BY_ID[selected].size*1.2):40;
 const invalidate=useThree(s=>s.invalidate);
 useEffect(()=>{shadowDirty.current=true;invalidate()},[definition,mode,visible,layers,quality,sun,preview,selected,shadows,lighting,invalidate]);
 useFrame(({gl})=>{if(shadowDirty.current){gl.shadowMap.needsUpdate=true;shadowDirty.current=false}});
 return <>
  <SceneEnvironment preview={preview} lighting={mode==="view"?"day":lighting} sun={mode==="view"?1.8:sun} shadows={profile.shadows&&shadows} shadowSize={profile.shadowSize} shadowExtent={shadowExtent}/>
  <SceneObjects/>
  {preview&&<group name="preview-floor"><Box position={[0,-.14,0]} scale={[160,.1,160]} mat="paving" cast={false}/></group>}
  {grid&&mode!=="view"&&<gridHelper args={[68,34,"#697f79","#a1b1a7"]} position-y={.23}/>}
  <StudioCamera enabled={active}/>
  {mode!=="view"&&<SceneDebug/>}
  {!preview&&mode==="editor"&&tool!=="select"&&<TransformGizmo/>}
  <AdaptiveDpr/>
  <RenderMonitor active={active}/>
 </>;
}
export function StudioScene(){
 const quality=useStudioStore(s=>s.quality),shadows=useStudioStore(s=>s.shadows),pageActive=usePageActive();
 return <SceneBoundary><Canvas shadows={QUALITY[quality].shadows&&shadows?"soft":false} dpr={QUALITY[quality].dpr} frameloop={pageActive?"demand":"never"} camera={{position:INITIAL_CAMERA_POSITION,fov:43,near:.1,far:240}} performance={{min:.6,debounce:400}} gl={{antialias:true,powerPreference:"low-power",alpha:false}}
  onCreated={({gl})=>{gl.setClearColor("#e5eae7");gl.shadowMap.autoUpdate=false;useStudioStore.getState().setReady()}} fallback={<div className="scene-error">Для перегляду сцени потрібен WebGL.</div>}>
  <SceneContents active={pageActive}/>
 </Canvas></SceneBoundary>;
}
