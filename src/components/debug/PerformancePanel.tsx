"use client";
import { Activity, ChevronDown, Gauge } from "lucide-react";
import { useStudioStore } from "@/stores/useStudioStore";
import { QUALITY } from "@/lib/studioConfig";
import type { Quality } from "@/types/studio";

export function PerformancePanel(){
 const quality=useStudioStore(s=>s.quality),metrics=useStudioStore(s=>s.metrics),rendering=useStudioStore(s=>s.rendering),ready=useStudioStore(s=>s.ready);
 return <div className="performance-panel">
  <div className="performance-title"><span><Activity size={14}/>РЕНДЕРИНГ</span><i className={rendering?"is-rendering":""}/></div>
  <div className="performance-numbers"><div><b>{metrics.fps||"—"}</b><span>FPS{!rendering&&metrics.fps?" · останній":""}</span></div><div><b>{metrics.frameTime?metrics.frameTime.toFixed(1):"—"}</b><span>ms / кадр</span></div></div>
  <div className="render-state">{!ready?"Підготовка сцени…":rendering?"Сцена активна":"Очікування · GPU відпочиває"}</div>
  <div className="quality-field"><Gauge size={15}/><label htmlFor="render-quality">Якість</label><select id="render-quality" value={quality} onChange={event=>useStudioStore.getState().setQuality(event.target.value as Quality)}>{(Object.keys(QUALITY) as Quality[]).map(key=><option key={key} value={key}>{QUALITY[key].label}</option>)}</select><ChevronDown size={12}/></div>
  <details className="render-details"><summary>Статистика сцени</summary><span>{metrics.calls||"—"} draw calls</span><span>{metrics.triangles?`${(metrics.triangles/1000).toFixed(1)}k`:"—"} трикутників</span><span>{metrics.geometries??"—"} геометрій · {metrics.textures??"—"} текстур</span><span title="Час виклику WebGLRenderer.render; не час GPU">CPU render: {metrics.cpuTime?.toFixed(2)??"—"} ms</span></details>
 </div>;
}
