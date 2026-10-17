"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { VehicleKind, VehicleAnimation } from "../types/assets";
import { geometry, material } from "../resources";
import { VEHICLE_GEOMETRY, RIDER_GEOMETRY } from "./vehicleAssets";
import { VehicleLabels } from "./VehicleLabels";
import { VEHICLE_ROUNDED, type GeometryPart } from "./assetBuilder";

function Parts({ parts, headlights = true }: { parts: GeometryPart[]; headlights?: boolean }) {
  return (
    <>
      {parts.map((part) => (
        <mesh
          key={part.material}
          name={`part-${part.material}`}
          geometry={part.geometry}
          material={
            material[part.material === "headlight" && !headlights ? "chrome" : part.material]
          }
          castShadow={!["vehicleGlass", "headlight", "tail"].includes(part.material)}
          receiveShadow
          dispose={null}
        />
      ))}
    </>
  );
}

const IDLE: VehicleAnimation = { wheelPreview: false, signal: "off", beacon: false };
export interface VehicleModelProps {
  kind: VehicleKind;
  active?: boolean;
  headlights?: boolean;
  readAnimation?: () => VehicleAnimation;
}
export function VehicleModel({
  kind,
  active = false,
  headlights = true,
  readAnimation = () => IDLE,
}: VehicleModelProps) {
  const wheels = useRef<THREE.Group>(null),
    lamps = useRef<THREE.Group>(null),
    beacon = useRef<THREE.Group>(null),
    time = useRef(0);
  const model = VEHICLE_GEOMETRY[kind],
    bike = kind === "motorcycle";
  const { radius, width, track, axles, centerY } = model.wheels;
  useFrame((_, delta) => {
    if (!active) return;
    const state = readAnimation();
    time.current += Math.min(delta, 0.05);
    if (wheels.current && state.wheelPreview)
      for (const wheel of wheels.current.children) wheel.rotation.x -= Math.min(delta, 0.05) * 3;
    const on = Math.floor(time.current / 0.4) % 2 === 0;
    if (lamps.current)
      for (const lamp of lamps.current.children)
        lamp.visible =
          on &&
          (state.signal === "hazard" ||
            (lamp.position.x < 0 ? state.signal === "right" : state.signal === "left"));
    if (beacon.current)
      for (let index = 0; index < beacon.current.children.length; index++)
        beacon.current.children[index].visible =
          state.beacon && Math.floor(time.current / 0.18) % 2 === index % 2;
  });
  const lightY =
    kind === "fire" ? 1.12 : kind === "ambulance" ? 0.89 : kind === "suv" ? 1 : bike ? 0.97 : 0.81;
  return (
    <group>
      <group name={`body-${kind}`}>
        <Parts parts={model.parts} headlights={headlights} />
      </group>
      <VehicleLabels kind={kind} />
      {bike && (
        <group name="motorcycle-rider">
          <Parts parts={RIDER_GEOMETRY} />
        </group>
      )}
      <group name={`wheels-${kind}`} ref={wheels}>
        {axles.flatMap((z) =>
          (bike ? [0] : [-track, track]).map((x) => (
            <group key={`${x}-${z}`} position={[x, centerY, z]}>
              <mesh
                geometry={geometry.tire}
                material={material.rubber}
                rotation-z={Math.PI / 2}
                scale={[radius, width, radius]}
                castShadow
                dispose={null}
              />
              <mesh
                geometry={geometry.rim}
                material={material.chrome}
                scale={[width, radius, radius]}
                dispose={null}
              />
            </group>
          )),
        )}
      </group>
      <group ref={lamps} name={`signals-${kind}`} visible={active}>
        {[-1, 1].flatMap((side) =>
          [-1, 1].map((end) => (
            <mesh
              key={`${side}-${end}`}
              position={[
                side * (bike ? 0.27 : model.halfWidth - 0.1),
                lightY,
                end * (model.length / 2 + 0.052),
              ]}
              geometry={geometry.box}
              material={material.signal}
              scale={[bike ? 0.09 : 0.104, 0.078, 0.016]}
              dispose={null}
            />
          )),
        )}
      </group>
      {model.beacon && (
        <group ref={beacon} name={`beacon-${kind}`} visible={active}>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[
                side * model.beacon!.width * 0.29,
                model.beacon!.roofY + 0.125,
                model.beacon!.z,
              ]}
              geometry={VEHICLE_ROUNDED}
              material={material.beacon}
              scale={[model.beacon!.width * 0.372, 0.134, 0.244]}
              dispose={null}
            />
          ))}
        </group>
      )}
    </group>
  );
}
