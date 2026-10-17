import { Building } from "@traffic-laws/assets-3d/environment/CityEnvironment";
import { BUILDINGS } from "@/lib/sceneAssets";
import { SceneAsset } from "../SceneAsset";
export * from "@traffic-laws/assets-3d/environment/CityEnvironment";
export function Buildings({only}:{only?:string}){return <group>{([0,1,2,3] as const).map(index=>{const asset=BUILDINGS[index];return !only||asset.id===only?<SceneAsset key={asset.id} asset={asset}><Building index={index}/></SceneAsset>:null})}</group>}
