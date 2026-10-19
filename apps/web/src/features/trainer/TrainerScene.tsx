"use client";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  Greenery,
  IntersectionRoad,
  RoadSign,
  TrafficLight,
  VehicleModel,
} from "@traffic-laws/assets-3d";
import { SceneEnvironment } from "@traffic-laws/scene-engine/react";
import type { Direction } from "@traffic-laws/country-rules/traffic-situation";
import { advancePlayback, routeLength, routePose, sampleMotion, type Playback } from "./motion";
import { durationOf, signalAt, type TrainingCar, type TrainingScenario } from "./scenarios";

export type CameraMode = "iso" | "top" | "driver" | "free";
export interface CameraCommand {
  mode: CameraMode;
  revision: number;
  zoom: number;
}
interface SceneProps {
  scenario: TrainingScenario;
  playback: RefObject<Playback>;
  selected: string;
  cameraCommand: CameraCommand;
  onSelect: (id: string) => void;
  onFinished: () => void;
  playing: boolean;
}
function Clock({ playback, scenario, onFinished, playing }: SceneProps) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [playing, invalidate]);
  useFrame((_, delta) => {
    const wasRunning = playback.current.running;
    advancePlayback(playback.current, delta, durationOf(scenario));
    if (playback.current.running) invalidate();
    if (wasRunning && !playback.current.running) onFinished();
  }, -2);
  return null;
}
function CameraRig({ cameraCommand, playback, selected, scenario }: SceneProps) {
  const { camera, gl, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const moving = useRef(true);
  const goal = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const pose = useMemo(() => ({ x: 0, z: 0, yaw: 0 }), []);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    orbit.enableDamping = true;
    orbit.enablePan = false;
    orbit.minDistance = 14;
    orbit.maxDistance = 75;
    orbit.minPolarAngle = 0.015;
    orbit.maxPolarAngle = Math.PI / 2.25;
    const start = () => {
      moving.current = false;
    };
    orbit.addEventListener("start", start);
    const change = () => invalidate();
    orbit.addEventListener("change", change);
    controls.current = orbit;
    return () => {
      orbit.removeEventListener("start", start);
      orbit.removeEventListener("change", change);
      orbit.dispose();
      controls.current = null;
    };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    moving.current = true;
    invalidate();
  }, [cameraCommand, selected, invalidate]);
  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit) return;
    orbit.enabled = cameraCommand.mode !== "driver";
    orbit.enableRotate = cameraCommand.mode !== "top";
    const entry = scenario.cars.find((car) => car.id === selected) ?? scenario.cars[0];
    sampleMotion(entry, playback.current.time, pose);
    if (cameraCommand.mode === "driver") {
      // Elevated chase view keeps the lens above the road and away from roadside buildings.
      goal.set(
        pose.x - Math.sin(pose.yaw) * 7 * cameraCommand.zoom,
        4.5 * cameraCommand.zoom,
        pose.z - Math.cos(pose.yaw) * 7 * cameraCommand.zoom,
      );
      target.set(pose.x + Math.sin(pose.yaw) * 7, 0.8, pose.z + Math.cos(pose.yaw) * 7);
    } else {
      target.set(pose.x * 0.12, 0, pose.z * 0.12);
      const zoom = cameraCommand.zoom;
      goal.set(
        cameraCommand.mode === "top" ? 0 : 31 * zoom,
        (cameraCommand.mode === "top" ? 49 : 32) * zoom,
        cameraCommand.mode === "top" ? 0.05 : 36 * zoom,
      );
    }
    if (moving.current || cameraCommand.mode === "driver") {
      const blend = 1 - Math.exp(-Math.min(delta, 0.1) * 7);
      camera.position.lerp(goal, blend);
      orbit.target.lerp(target, blend);
      camera.lookAt(orbit.target);
      if (
        camera.position.distanceToSquared(goal) > 0.001 ||
        orbit.target.distanceToSquared(target) > 0.001
      )
        invalidate();
      else moving.current = false;
    }
    if (orbit.enabled) orbit.update();
  });
  return null;
}
function CarLabel({ entry }: { entry: TrainingCar }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (context) {
      context.fillStyle = entry.color;
      context.beginPath();
      context.arc(64, 64, 54, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "white";
      context.lineWidth = 6;
      context.stroke();
      context.fillStyle = "white";
      context.font = "bold 70px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(entry.id === "a" ? "А" : entry.id === "b" ? "Б" : "В", 64, 67);
    }
    return new THREE.CanvasTexture(canvas);
  }, [entry]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={[0, 3.6, 0]} scale={[1.6, 1.6, 1]}>
      <spriteMaterial map={texture} depthTest={false} />
    </sprite>
  );
}
function MovingCar({
  entry,
  playback,
  selected,
  onSelect,
}: {
  entry: TrainingCar;
  playback: RefObject<Playback>;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const indicators = useRef<THREE.Group>(null);
  const pose = useMemo(() => sampleMotion(entry, 0), [entry]);
  useFrame(() => {
    sampleMotion(entry, playback.current.time, pose);
    if (group.current) {
      group.current.position.set(pose.x, 0.02, pose.z);
      group.current.rotation.y = pose.yaw;
    }
    if (indicators.current)
      indicators.current.visible =
        entry.maneuver !== "straight" &&
        playback.current.time < entry.release + 9 &&
        Math.floor(playback.current.time / 0.4) % 2 === 0;
  });
  return (
    <group
      ref={group}
      position={[pose.x, 0.02, pose.z]}
      rotation-y={pose.yaw}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(entry.id);
      }}
    >
      <VehicleModel kind={entry.kind} />
      <CarLabel entry={entry} />
      <mesh rotation-x={-Math.PI / 2} position-y={0.035}>
        <ringGeometry args={[selected ? 2.8 : 2.5, selected ? 3.02 : 2.59, 48]} />
        <meshBasicMaterial
          color={entry.color}
          transparent
          opacity={selected ? 1 : 0.5}
          depthWrite={false}
        />
      </mesh>
      <group ref={indicators} visible={entry.maneuver !== "straight"}>
        {[-2.15, 2.15].map((z) => (
          <mesh key={z} position={[entry.maneuver === "left" ? 0.87 : -0.87, 0.83, z]}>
            <boxGeometry args={[0.15, 0.12, 0.08]} />
            <meshBasicMaterial color="#ffad19" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
function Route({ entry, selected }: { entry: TrainingCar; selected: boolean }) {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    // Only show the maneuver near the junction, not the offscreen end of the route.
    const extent = Math.min(routeLength(entry.maneuver), 27);
    for (let index = 0; index < 40; index++) {
      for (const distance of [(extent * index) / 40, (extent * (index + 0.65)) / 40]) {
        const pose = routePose(entry, distance, { x: 0, z: 0, yaw: 0 });
        points.push(new THREE.Vector3(pose.x, 0.055, pose.z));
      }
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [entry]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const tip = routePose(entry, 22, { x: 0, z: 0, yaw: 0 });
  return (
    <group>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color={entry.color} transparent opacity={selected ? 1 : 0.4} />
      </lineSegments>
      <group position={[tip.x, 0.12, tip.z]} rotation-y={tip.yaw}>
        <mesh rotation-x={Math.PI / 2}>
          <coneGeometry args={[0.42, 1.1, 3]} />
          <meshBasicMaterial color={entry.color} />
        </mesh>
      </group>
    </group>
  );
}
const APPROACHES: Direction[] = ["south", "east", "north", "west"];
const ANGLES = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
function Signal({
  approach,
  scenario,
  playback,
}: {
  approach: Direction;
  scenario: TrainingScenario;
  playback: RefObject<Playback>;
}) {
  const lights = useRef<THREE.Group>(null);
  useFrame(() => {
    const indication = signalAt(scenario, approach, playback.current.time);
    lights.current?.children.forEach((child) => {
      child.visible = child.name === indication;
    });
  });
  return (
    <>
      <TrafficLight signal="off" />
      <group ref={lights}>
        {(["red", "yellow", "green"] as const).map((color, index) => (
          <mesh
            key={color}
            name={color}
            position={[0, 4 - index * 0.4, 0.33]}
            visible={signalAt(scenario, approach, 0) === color}
          >
            <sphereGeometry args={[0.15, 12, 8]} />
            <meshBasicMaterial
              color={color === "green" ? "#52ff7b" : color === "yellow" ? "#ffd43b" : "#ff453a"}
            />
          </mesh>
        ))}
      </group>
    </>
  );
}
export default function TrainerScene(props: SceneProps) {
  return (
    <Canvas
      frameloop="demand"
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [31, 32, 36], fov: 43, near: 0.1, far: 180 }}
      fallback={<p>WebGL недоступний. Увімкніть апаратне прискорення для 3D.</p>}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
    >
      <Clock {...props} />
      <CameraRig {...props} />
      <SceneEnvironment shadowSize={1024} shadowExtent={35} />
      <IntersectionRoad />
      <Greenery />
      {APPROACHES.map((approach, index) => (
        <group key={approach} rotation-y={ANGLES[index]}>
          <group position={[5.7, 0.16, 9.5]}>
            <Signal approach={approach} scenario={props.scenario} playback={props.playback} />
          </group>
          {props.scenario.control === "priority-signs" && (
            <group position={[5.8, 0.16, 13]}>
              <RoadSign kind={approach === "east" || approach === "west" ? "priority" : "yield"} />
            </group>
          )}
        </group>
      ))}
      {props.scenario.cars.map((entry) => (
        <group key={entry.id}>
          <Route entry={entry} selected={props.selected === entry.id} />
          <MovingCar
            entry={entry}
            playback={props.playback}
            selected={props.selected === entry.id}
            onSelect={props.onSelect}
          />
        </group>
      ))}
    </Canvas>
  );
}
