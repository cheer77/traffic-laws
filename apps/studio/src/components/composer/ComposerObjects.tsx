"use client";
import { SelectionRing } from "../scene/SelectionRing";
import { memo } from "react";
import { ASSET_METADATA, type SceneObject } from "@traffic-laws/scene-engine";
import { SceneModel, SceneRenderer, VEHICLE_KINDS } from "@traffic-laws/scene-engine/react";
import { useComposerStore } from "@/stores/useComposerStore";
import { useStudioStore } from "@/stores/useStudioStore";
import type { Layer } from "@/types/studio";
const layers: Record<string, Layer> = {
  buildings: "buildings",
  vegetation: "trees",
  characters: "characters",
  "traffic-signs": "signs",
  "traffic-lights": "lights",
};
const select = (id: string) => {
  if (!useComposerStore.getState().dragging) useStudioStore.getState().selectObject(id, false);
};
const Model = memo(function Model({ object }: { object: SceneObject }) {
  const active = useStudioStore((s) => s.selectedId === object.instanceId);
  const headlights = useStudioStore((s) => s.headlights);
  const trafficSignal = useStudioStore((s) => s.trafficSignal);
  const viewing = useComposerStore((s) => s.mode === "view");
  const kind = VEHICLE_KINDS[object.assetId];
  const radius =
    kind === "fire" ? 3.5 : kind === "ambulance" ? 3 : kind === "motorcycle" ? 1.35 : 2.55;
  return (
    <>
      {active && kind && !viewing && <SelectionRing radius={radius} />}
      <SceneModel
        object={object}
        active={active && !viewing}
        readAnimation={useStudioStore.getState}
        headlights={viewing ? undefined : headlights && (object.properties.headlights ?? true)}
        signal={viewing || trafficSignal === "junction" ? undefined : trafficSignal}
      />
    </>
  );
});
const renderModel = (object: SceneObject) => <Model object={object} />;
export function ComposerObjects() {
  const scene = useComposerStore((s) => s.scene),
    mode = useComposerStore((s) => s.mode);
  const visible = useStudioStore((s) => s.visible),
    enabledLayers = useStudioStore((s) => s.layers);
  return (
    <SceneRenderer
      scene={scene}
      onSelect={mode === "editor" ? select : undefined}
      renderModel={renderModel}
      isVisible={(object) => {
        if (mode === "view") return true;
        const kind = VEHICLE_KINDS[object.assetId],
          layer = layers[ASSET_METADATA.get(object.assetId)!.category];
        return (!kind || visible[kind]) && (!layer || enabledLayers[layer]);
      }}
    />
  );
}
