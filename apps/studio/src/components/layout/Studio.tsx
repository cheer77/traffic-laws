"use client";
import dynamic from "next/dynamic";

import { Box, ChevronRight, Focus, Grid2X2, Hand, Layers3, Maximize2, MousePointer2, Move, Orbit, RotateCcw, Scan, SlidersHorizontal } from "lucide-react";
import { useStudioStore } from "@/stores/useStudioStore";
import { sceneAsset } from "@/lib/composer/selection";
import { useComposerStore } from "@/stores/useComposerStore";
import { ComposerPersistence, MODE_LABELS } from "../composer/ComposerPanel";
import { changeMode } from "@/lib/composer/navigation";
import { StudioPanel } from "@/components/debug/StudioPanel";
import { PerformancePanel } from "@/components/debug/PerformancePanel";
import type { CameraMode } from "@/types/studio";

const Scene=dynamic(()=>import("@/components/scene/StudioScene").then(module=>module.StudioScene),{ssr:false,loading:()=> <div className="scene-loading"><span/><b>Готуємо міську сцену</b><small>Геометрія · матеріали · освітлення</small></div>});
const CAMERAS:Array<{id:CameraMode;label:string;icon:typeof Box}>=[{id:"iso",label:"Ізометрія",icon:Box},{id:"top",label:"Зверху",icon:Scan},{id:"free",label:"Вільна",icon:Orbit},{id:"focus",label:"Фокус",icon:Focus}];

export function Studio(){
 const definition=useComposerStore(s=>s.scene),mode=useComposerStore(s=>s.mode);
 const preview=useStudioStore(s=>s.preview);
 const selected=useStudioStore(s=>s.selectedId),camera=useStudioStore(s=>s.camera),grid=useStudioStore(s=>s.grid),panelOpen=useStudioStore(s=>s.panelOpen),ready=useStudioStore(s=>s.ready);
 const visibleCount=definition.objects.length;
 return <main className="studio-shell"><ComposerPersistence/>
  <header className="studio-header">
   <button className="studio-brand" onClick={()=>changeMode("editor")} aria-label="РУХ Scene Studio"><span className="brand-symbol"><Move size={21} strokeWidth={1.8}/></span><b>РУХ</b><i>/</i><span>Scene Studio</span><small>LAB</small></button>
   <div className="studio-header-right"><span className="local-badge"><span className="status-dot"/>Локальне середовище</span><button className="reset-button" aria-label="Скинути студію" title="Скинути студію" onClick={()=>{if(window.confirm("Відновити початкове розміщення поточної сцени? Незбережені зміни буде втрачено.")){useComposerStore.getState().restore();changeMode("editor");useStudioStore.getState().setCamera("iso")}}}><RotateCcw size={14}/><span>Скинути студію</span></button></div>
  </header>
  <div className="studio-workspace">
   <StudioPanel/>
   {panelOpen&&<button className="panel-backdrop" aria-label="Закрити панель об'єктів" onClick={()=>useStudioStore.getState().toggle("panelOpen")}/>}
   <section className="studio-viewport" aria-label="Міська 3D-сцена">
    <div className="viewport-toolbar"><div className="scene-breadcrumb"><button className="icon-button mobile-menu" aria-label="Відкрити панель об'єктів" aria-expanded={panelOpen} aria-controls="studio-panel" onClick={()=>useStudioStore.getState().toggle("panelOpen")}><SlidersHorizontal size={17}/></button><Layers3 size={15}/><span>{MODE_LABELS[mode]}</span><ChevronRight size={13}/><b>{definition.name}{preview?" · Preview":""}</b><span className="scene-version">v1</span></div>{mode!=="view"&&<button className={`grid-button ${grid?"is-active":""}`} onClick={()=>useStudioStore.getState().toggle("grid")} aria-pressed={grid}><Grid2X2 size={15}/><span>Сітка</span></button>}</div>
    <div className="canvas-container"><Scene/></div>
    {mode!=="view"&&<div className="scene-caption"><span className="eyebrow">URBAN INTERSECTION</span><h1>Простір для розробки.</h1><p>Одна сцена. Усі інструменти під рукою.</p></div>}
    {mode!=="view"&&<PerformancePanel/>}
    <div className="scene-axis" aria-hidden="true"><span className="axis-y">Y</span><span className="axis-z">Z</span><span className="axis-x">X</span><i/></div>
    <div className="viewport-bottom">
     {mode!=="view"&&<div className="selected-info"><span className="selection-icon"><MousePointer2 size={15}/></span><span><small>АКТИВНИЙ ОБ’ЄКТ</small><b>{sceneAsset(definition,selected,preview).name}</b></span><button className="icon-button" title="Фокус на моделі" aria-label="Фокус на моделі" onClick={()=>useStudioStore.getState().setCamera("focus")}><Maximize2 size={16}/></button></div>}
     <nav className="camera-toolbar" aria-label="Керування камерою">
      {CAMERAS.map(({id,label,icon:Icon})=><button key={id} className={camera===id?"is-active":""} aria-pressed={camera===id} aria-label={label} title={label} onClick={()=>useStudioStore.getState().setCamera(id)}><Icon size={16}/><span>{label}</span></button>)}
      <span className="toolbar-separator"/><button aria-label="Скинути камеру" title="Скинути камеру" onClick={()=>useStudioStore.getState().setCamera("iso")}><RotateCcw size={16}/></button>
     </nav>
    </div>
   </section>
  </div>
  <footer className="studio-statusbar"><span><span className="status-dot"/>{ready?"Сцену завантажено":"Завантаження…"}<i/>{visibleCount} моделей</span><span className="interaction-hints"><Orbit size={12}/>Обертання <i/><Hand size={12}/>Права кнопка — pan <i/>Колесо — масштаб</span><span>Three.js <i/>WebGL</span></footer>
 </main>;
}
