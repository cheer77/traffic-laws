"use client";
import { useState } from "react";
import { ASSET_REGISTRY, ASSET_CATEGORIES, type AssetCategory } from "@traffic-laws/assets-3d/registry";
import { STUDIO_ASSET_IDS } from "@/lib/assetLibrary";
import { useStudioStore } from "@/stores/useStudioStore";
const labels:Record<AssetCategory,string>={vehicles:"Транспорт",characters:"Персонажі",buildings:"Будівлі","traffic-signs":"Дорожні знаки","traffic-lights":"Світлофори",intersections:"Перехрестя",vegetation:"Озеленення","street-furniture":"Міські меблі"};
export function AssetLibrary(){
 const [query,setQuery]=useState("");
 const matches=ASSET_REGISTRY.filter(asset=>`${asset.name} ${asset.id}`.toLocaleLowerCase("uk").includes(query.toLocaleLowerCase("uk")));
 return <details className="tuning-panel"><summary>Бібліотека 3D · {ASSET_REGISTRY.length}</summary><div className="tuning-content">
 <label className="field-label" htmlFor="asset-search">Пошук моделі</label><input id="asset-search" type="search" value={query} onChange={event=>setQuery(event.target.value)}/>
 {ASSET_CATEGORIES.map(category=>{const assets=matches.filter(asset=>asset.category===category);return assets.length>0?<section key={category} aria-label={labels[category]}><h3 className="section-label">{labels[category]}</h3>{assets.map(asset=><button key={asset.id} className="reset-button tool-button" title={`${asset.id} · ${asset.dimensions.map(n=>n.toFixed(2)).join(" × ")} м`} onClick={()=>{useStudioStore.getState().selectObject(STUDIO_ASSET_IDS[asset.id]);useStudioStore.getState().setPreview(true)}}>{asset.name}</button>)}</section>:null})}
 {matches.length===0&&<p>Моделей не знайдено.</p>}
 </div></details>;
}
