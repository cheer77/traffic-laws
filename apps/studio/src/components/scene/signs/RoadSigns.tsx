import { SIGNS } from "@/lib/sceneAssets";
import { SceneAsset } from "../SceneAsset";
import { AssetParts } from "../AssetParts";
import { SIGN_PARTS } from "./signAssets";

export function RoadSigns({only}:{only?:string}){return <group>
 {SIGNS.filter(asset=>!only||asset.id===only).map(asset=><SceneAsset key={asset.id} asset={asset}>
  <AssetParts parts={SIGN_PARTS[asset.id.includes("yield")?"yield":asset.id.includes("stop")?"stop":"priority"]}/>
 </SceneAsset>)}
 </group>}
