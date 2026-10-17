"use client";
import { Building2, Eye, EyeOff, Focus, Footprints, Lamp, Layers3, TrafficCone, TreePine, X } from "lucide-react";
import { ASSET_BY_ID, VEHICLES } from "@/lib/studioConfig";
import { useStudioStore } from "@/stores/useStudioStore";
import type { Layer, Signal } from "@/types/studio";
import { VehicleThumbnail } from "@/components/ui/VehicleThumbnail";
import { AssetLibrary } from "./AssetLibrary";
import { useComposerStore } from "@/stores/useComposerStore";
import { ComposerPanel, ModeNavigation, MODE_LABELS } from "../composer/ComposerPanel";
import { StudioTools } from "./StudioTools";

const LAYERS:Array<{id:Layer;name:string;icon:typeof Building2}>=[
 {id:"characters",name:"Персонажі",icon:Footprints},{id:"buildings",name:"Будівлі",icon:Building2},
 {id:"trees",name:"Озеленення",icon:TreePine},{id:"signs",name:"Дорожні знаки",icon:TrafficCone},{id:"lights",name:"Світлофори",icon:Lamp},
];

export function StudioPanel(){
 const mode=useComposerStore(s=>s.mode);
 const visible=useStudioStore(s=>s.visible),selected=useStudioStore(s=>s.selectedId),layers=useStudioStore(s=>s.layers),panelOpen=useStudioStore(s=>s.panelOpen);
 return <aside id="studio-panel" className={`studio-panel ${panelOpen?"is-open":""}`} aria-label="Об'єкти та налаштування сцени">
  <div className="panel-heading"><div><span className="eyebrow">SCENE EXPLORER</span><h2>{MODE_LABELS[mode]}</h2></div><button className="icon-button mobile-close" aria-label="Закрити панель" onClick={()=>useStudioStore.getState().toggle("panelOpen")}><X size={18}/></button></div>
  <div className="panel-scroll">
   <ModeNavigation/>
   <ComposerPanel/>
   {mode==="editor"&&<details className="tuning-panel"><summary>Шари та видимість · лише редактор</summary><div className="tuning-content">
   <div className="section-label"><span>ТРАНСПОРТ</span><span>{Object.values(visible).filter(Boolean).length} / 6</span></div>
   <div className="asset-list">{VEHICLES.map(asset=><div key={asset.id} className={`asset-row ${selected===`vehicle-${asset.id}`?"is-selected":""} ${!visible[asset.id]?"is-hidden":""}`}>
    <button className="asset-select" aria-label={`Фокус: ${asset.name}`} aria-pressed={selected===`vehicle-${asset.id}`} onClick={()=>useStudioStore.getState().select(asset.id)}>
     <span className="asset-thumbnail"><VehicleThumbnail kind={asset.id} color={asset.color}/></span>
     <span className="asset-caption"><b>{asset.name}</b><small>{asset.category}</small></span>
    </button>
    <button className="visibility-button" aria-label={`${visible[asset.id]?"Сховати":"Показати"}: ${asset.name}`} aria-pressed={visible[asset.id]} onClick={()=>useStudioStore.getState().toggleVehicle(asset.id)}>{visible[asset.id]?<Eye size={15}/>:<EyeOff size={15}/>}</button>
   </div>)}</div>
   <div className="panel-divider"/>
   <div className="section-label"><span>СЕРЕДОВИЩЕ</span><Layers3 size={13}/></div>
   <div className="layer-list">{LAYERS.map(({id,name,icon:Icon})=><label key={id} className="layer-row"><span><Icon size={16}/>{name}</span><input type="checkbox" role="switch" checked={layers[id]} onChange={()=>useStudioStore.getState().toggleLayer(id)}/></label>)}</div>
   </div></details>}
   {mode==="editor"&&<details className="tuning-panel"><summary>Анімація моделі · діагностика</summary><TuningControls/></details>}
   {mode==="library"&&<><AssetLibrary/><details className="tuning-panel"><summary>Налаштування Preview</summary><TuningControls/></details></>}
   {(mode==="editor"||mode==="library")&&<StudioTools/>}
  </div>
  <div className="panel-footer"><span className="status-dot"/>Локальна сцена<span>01 / 01</span></div>
 </aside>;
}

function TuningControls(){
 const selected=useStudioStore(s=>s.selectedId);
 const active=useStudioStore(s=>s.active),headlights=useStudioStore(s=>s.headlights),signal=useStudioStore(s=>s.signal),beacon=useStudioStore(s=>s.beacon),wheelPreview=useStudioStore(s=>s.wheelPreview),sun=useStudioStore(s=>s.sun);
 const special=["police","ambulance","fire"].includes(active);
 if(!selected.startsWith("vehicle-"))return <p className="tool-note">Для налаштування моделі виберіть транспорт.</p>;
 return <div className="tuning-content">
  <div className="active-model"><Focus size={13}/>{ASSET_BY_ID[active].name}</div>
  <label className="layer-row"><span>Фари</span><input type="checkbox" role="switch" checked={headlights} onChange={()=>useStudioStore.getState().toggle("headlights")}/></label>
  <label className="field-label" htmlFor="turn-signal">Покажчики повороту</label>
  <select id="turn-signal" value={signal} onChange={event=>useStudioStore.getState().setSignal(event.target.value as Signal)}><option value="off">Вимкнено</option><option value="left">Ліворуч</option><option value="right">Праворуч</option><option value="hazard">Аварійна сигналізація</option></select>
  <label className="layer-row"><span>Обертання коліс</span><input type="checkbox" role="switch" checked={wheelPreview} onChange={()=>useStudioStore.getState().toggle("wheelPreview")}/></label>
  {special&&<label className="layer-row"><span>Спецсигнал</span><input type="checkbox" role="switch" checked={beacon} onChange={()=>useStudioStore.getState().toggle("beacon")}/></label>}
  <label className="field-label" htmlFor="sun-intensity">Денне освітлення <span>{sun.toFixed(1)}</span></label>
  <input id="sun-intensity" type="range" min=".6" max="3" step=".1" value={sun} onChange={event=>useStudioStore.getState().setSun(Number(event.target.value))}/>
 </div>;
}
