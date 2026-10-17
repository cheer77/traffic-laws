"use client";
import { Box, ChevronDown, Focus, Wrench } from "lucide-react";
import { SCENE_ASSETS, SCENE_ASSET_BY_ID } from "@/lib/sceneAssets";
import { useStudioStore } from "@/stores/useStudioStore";
import type { DebugFlag, TrafficSignal } from "@/types/studio";

const vector=(values:number[])=>values.map(n=>n.toFixed(2)).join(" / ");
const FLAGS:Array<[DebugFlag,string]>=[["bounds","Габарити об’єктів"],["axes","Осі світу"],["lanes","Центри смуг"],["wireframe","Каркас вибраного об’єкта"],["lightHelpers","Напрямок освітлення"]];
export function StudioTools(){
 const selected=useStudioStore(s=>s.selectedId),info=useStudioStore(s=>s.inspection),preview=useStudioStore(s=>s.preview),angle=useStudioStore(s=>s.previewAngle);
 const debug=useStudioStore(s=>s.debug),lighting=useStudioStore(s=>s.lighting),shadows=useStudioStore(s=>s.shadows),frameLimit=useStudioStore(s=>s.frameLimit),trafficSignal=useStudioStore(s=>s.trafficSignal);
 const state=useStudioStore.getState(),asset=SCENE_ASSET_BY_ID[selected];
 return <>
  {preview&&<details className="tuning-panel"><summary><span><Box size={15}/>Інспектор об’єкта</span><ChevronDown size={14}/></summary>
   <div className="tuning-content">
    <label className="field-label" htmlFor="inspect-object">Вибрати об’єкт</label>
    <select id="inspect-object" value={selected} onChange={e=>state.selectObject(e.target.value)}>{SCENE_ASSETS.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>
    <div className="active-model">{asset.type} · {asset.name}</div>
    {info?<dl className="inspector-values">
     <dt>Позиція X/Y/Z, м</dt><dd>{vector(info.position)}</dd>
     <dt>Обертання X/Y/Z, °</dt><dd>{vector(info.rotation)}</dd>
     <dt>Масштаб X/Y/Z</dt><dd>{vector(info.scale)}</dd>
     <dt>Габарити X/Y/Z, м</dt><dd>{vector(info.size)}</dd>
     <dt>Bounding box · min</dt><dd>{vector(info.min)}</dd><dt>max</dt><dd>{vector(info.max)}</dd>
     <dt>Трикутники / геометрії</dt><dd>{info.triangles.toLocaleString("uk-UA")} / {info.geometries}</dd>
    </dl>:<p className="tool-note">Об’єкт приховано. Натисніть «Фокус», щоб показати.</p>}
    <button className="reset-button tool-button" onClick={()=>state.setCamera("focus")}><Focus size={13}/>Фокус на об’єкті</button>
    <label className="layer-row"><span>Ізольований перегляд</span><input type="checkbox" role="switch" checked={preview} onChange={e=>state.setPreview(e.target.checked)}/></label>
    {preview&&<><label className="field-label" htmlFor="preview-angle">Ракурс моделі</label><select id="preview-angle" value={angle} onChange={e=>state.setPreviewAngle(e.target.value as typeof angle)}><option value="front">Спереду · ¾</option><option value="rear">Ззаду · ¾</option><option value="side">Збоку</option></select><p className="tool-note">Обертайте мишею на 360°. Колесо — масштаб.</p></>}
    <label className="layer-row"><span>Каркас моделі</span><input type="checkbox" role="switch" checked={debug.wireframe} onChange={()=>state.toggleDebug("wireframe")}/></label>
    {info&&<details className="material-list"><summary>Матеріали · {info.materials.length}</summary>{info.materials.map(mat=><div key={mat}>{mat}</div>)}</details>}
   </div>
  </details>}
  <details className="tuning-panel"><summary><span><Wrench size={15}/>Світло та діагностика</span><ChevronDown size={14}/></summary>
   <div className="tuning-content">
    <label className="field-label" htmlFor="lighting-mode">Освітлення</label><select id="lighting-mode" value={lighting} onChange={e=>state.setLighting(e.target.value as typeof lighting)}><option value="day">День</option><option value="evening">Вечір</option></select>
    <label className="layer-row"><span>Тіні</span><input type="checkbox" role="switch" checked={shadows} onChange={()=>state.toggle("shadows")}/></label>
    <label className="field-label" htmlFor="frame-limit">Частота рендерингу</label><select id="frame-limit" value={frameLimit} onChange={e=>state.setFrameLimit(Number(e.target.value) as 30|60)}><option value="60">До 60 FPS</option><option value="30">Економний · до 30 FPS</option></select>
    <label className="field-label" htmlFor="traffic-signal">Перевірка світлофорів</label><select id="traffic-signal" value={trafficSignal} onChange={e=>state.setTrafficSignal(e.target.value as TrafficSignal)}><option value="junction">Початкові сигнали</option><option value="red">Червоний</option><option value="yellow">Жовтий</option><option value="green">Зелений</option><option value="off">Вимкнено</option></select>
    {FLAGS.filter(([key])=>key!=="wireframe").map(([key,label])=><label key={key} className="layer-row"><span>{label}</span><input type="checkbox" role="switch" checked={debug[key]} onChange={()=>state.toggleDebug(key)}/></label>)}
   </div>
  </details>
 </>;
}
