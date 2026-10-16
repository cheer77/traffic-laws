"use client";
import type { ReactNode } from "react";
import type { SceneAsset as Asset } from "@/lib/sceneAssets";
import { useStudioStore } from "@/stores/useStudioStore";

export function SceneAsset({asset,children}:{asset:Asset;children:ReactNode}){
 const preview=useStudioStore(s=>s.preview);
 return <group name={asset.id} userData={{inspectable:true}} position={preview?[0,0,0]:asset.position} rotation-y={preview?0:asset.rotation}
  onClick={event=>{event.stopPropagation();if(event.delta>3)return;useStudioStore.getState().selectObject(asset.id,false)}}>{children}</group>;
}
