import { Character } from "@traffic-laws/assets-3d/characters/Characters";
import { CHARACTERS } from "@/lib/sceneAssets";
import { SceneAsset } from "../SceneAsset";
export * from "@traffic-laws/assets-3d/characters/Characters";
export function Characters({only}:{only?:string}){return <group>{([0,1,2,3] as const).map(index=>{const asset=CHARACTERS[index];return !only||asset.id===only?<SceneAsset key={asset.id} asset={asset}><Character index={index}/></SceneAsset>:null})}</group>}
