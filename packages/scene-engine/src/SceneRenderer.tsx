"use client";
import { memo, type ReactNode } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { ASSET_MODELS } from "@traffic-laws/assets-3d/models";
import { VehicleModel } from "@traffic-laws/assets-3d/vehicles/VehicleModel";
import { TrafficLight } from "@traffic-laws/assets-3d/traffic-lights/TrafficLight";
import type { VehicleAnimation } from "@traffic-laws/assets-3d/types";
import {
  ASSET_METADATA,
  VEHICLE_KINDS,
  type SceneDefinition,
  type SceneObject,
} from "./definition";

/** Only validated definitions enter the renderer. Resource ownership stays in assets-3d. */
export const SceneModel = memo(function SceneModel({
  object,
  active = false,
  readAnimation,
  headlights,
  signal,
}: {
  object: SceneObject;
  active?: boolean;
  readAnimation?: () => VehicleAnimation;
  headlights?: boolean;
  signal?: SceneObject["properties"]["signal"];
}) {
  const kind = VEHICLE_KINDS[object.assetId];
  if (kind)
    return (
      <VehicleModel
        kind={kind}
        active={active}
        headlights={headlights ?? object.properties.headlights ?? true}
        readAnimation={readAnimation}
      />
    );
  if (object.assetId === "traffic-light.standard")
    return <TrafficLight signal={signal ?? object.properties.signal ?? "red"} />;
  const Model = ASSET_MODELS[object.assetId];
  return <Model />;
});
export const SceneInstance = memo(function SceneInstance({
  object,
  onSelect,
  renderModel,
}: {
  object: SceneObject;
  onSelect?: (id: string) => void;
  renderModel?: (object: SceneObject) => ReactNode;
}) {
  function select(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    if (event.delta > 3) return;
    onSelect?.(object.instanceId);
  }
  return (
    <group
      name={object.instanceId}
      userData={{ inspectable: true }}
      position={object.transform.position}
      rotation={object.transform.rotation}
      scale={object.transform.scale}
      onClick={onSelect ? select : undefined}
    >
      {renderModel ? renderModel(object) : <SceneModel object={object} />}
    </group>
  );
});
const GROUPS = [
  ["intersections", "roads"],
  ["buildings", "buildings"],
  ["vegetation", "vegetation"],
  ["street-furniture", "furniture"],
  ["characters", "characters"],
  ["traffic-signs", "signs"],
  ["traffic-lights", "traffic-lights"],
  ["vehicles", "vehicles"],
] as const;
export function SceneRenderer({
  scene,
  onSelect,
  renderModel,
  isVisible,
}: {
  scene: SceneDefinition;
  onSelect?: (id: string) => void;
  renderModel?: (object: SceneObject) => ReactNode;
  isVisible?: (object: SceneObject) => boolean;
}) {
  return (
    <group name="city-scene">
      {GROUPS.map(([category, name]) => {
        const objects = scene.objects.filter(
          (object) =>
            ASSET_METADATA.get(object.assetId)!.category === category &&
            (!isVisible || isVisible(object)),
        );
        return objects.length ? (
          <group key={category} name={name}>
            {objects.map((object) => (
              <SceneInstance
                key={object.instanceId}
                object={object}
                onSelect={onSelect}
                renderModel={renderModel}
              />
            ))}
          </group>
        ) : null;
      })}
    </group>
  );
}

/** The original urban lighting profile; viewport diagnostics can override it without changing scene data. */
export function SceneEnvironment({
  preview = false,
  lighting = "day",
  sun = 1.8,
  shadows = true,
  shadowSize = 1024,
  shadowExtent = 40,
}: {
  preview?: boolean;
  lighting?: "day" | "evening";
  sun?: number;
  shadows?: boolean;
  shadowSize?: number;
  shadowExtent?: number;
}) {
  const evening = lighting === "evening",
    background = preview ? "#e5e7e4" : evening ? "#a9b5c1" : "#e5eae7";
  return (
    <>
      <color attach="background" args={[background]} />
      {!preview && <fog attach="fog" args={[background, 90, 155]} />}
      <hemisphereLight
        args={[
          evening ? "#c7d6f4" : "#f2f7ff",
          evening ? "#8b8179" : "#b3aa90",
          evening ? 1.35 : 2.1,
        ]}
      />
      <directionalLight
        name="studio-sun"
        key={shadowSize}
        onUpdate={(light) => light.shadow.camera.updateProjectionMatrix()}
        position={evening ? [-30, 17, 23] : [-24, 38, 18]}
        intensity={sun * (evening ? 0.72 : 1)}
        color={evening ? "#ffd0a2" : "#fff4dd"}
        castShadow={shadows}
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-near={1}
        shadow-camera-far={110}
        shadow-bias={-0.0002}
        shadow-normalBias={0.018}
        shadow-radius={2}
      />
    </>
  );
}

export { VEHICLE_KINDS } from "./definition";
