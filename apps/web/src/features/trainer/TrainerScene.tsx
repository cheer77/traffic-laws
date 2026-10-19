"use client";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VehicleModel } from "@traffic-laws/assets-3d";
import type { SceneObject } from "@traffic-laws/scene-engine";
import { SceneEnvironment, SceneModel, SceneRenderer } from "@traffic-laws/scene-engine/react";
import { advancePlayback, routeLength, routePose, sampleMotion, type Playback } from "./motion";
import { durationOf, type TrainingCar, type TrainingScenario } from "./scenarios";

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
  useEffect(() => invalidate(), [playing, invalidate]);
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
    const change = () => invalidate();
    orbit.addEventListener("start", start);
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
      context.fillStyle = entry.color === "#f4f4ef" ? "#26332c" : "white";
      context.font = "bold 58px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(entry.label.slice(0, 1), 64, 67);
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
  const pose = useMemo(() => sampleMotion(entry, 0), [entry]);
  useFrame(() => {
    sampleMotion(entry, playback.current.time, pose);
    if (group.current) {
      group.current.position.set(pose.x, 0.02, pose.z);
      group.current.rotation.y = pose.yaw;
    }
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
      <VehicleModel kind={entry.kind} bodyColor={entry.color} />
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
    </group>
  );
}

function Route({ entry, selected }: { entry: TrainingCar; selected: boolean }) {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const start = entry.startDistance ?? 0;
    const extent = Math.min(routeLength(entry.maneuver), start + 27);
    for (let index = 0; index < 40; index++) {
      for (const distance of [
        start + ((extent - start) * index) / 40,
        start + ((extent - start) * (index + 0.65)) / 40,
      ]) {
        const pose = routePose(entry, distance, { x: 0, z: 0, yaw: 0 });
        points.push(new THREE.Vector3(pose.x, 0.055, pose.z));
      }
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [entry]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={entry.color} transparent opacity={selected ? 1 : 0.4} />
    </lineSegments>
  );
}

function AnimatedSceneModel({
  object,
  scenario,
  playback,
}: {
  object: SceneObject;
  scenario: TrainingScenario;
  playback: RefObject<Playback>;
}) {
  const initial = useRef<THREE.Group>(null);
  const changed = useRef<THREE.Group>(null);
  const isSignal = object.assetId === "traffic-light.standard";
  const nextSignal = object.properties.signal === "red" ? "green" : "red";
  useFrame(() => {
    if (!isSignal || scenario.signalChange === undefined) return;
    const afterChange = playback.current.time >= scenario.signalChange;
    if (initial.current) initial.current.visible = !afterChange;
    if (changed.current) changed.current.visible = afterChange;
  });
  const staticColor =
    scenario.number === 1
      ? { "queue-dark": "#354247", "queue-a": "#537457", "queue-b": "#c47755" }[object.instanceId]
      : scenario.number === 4 && object.instanceId === "waiting-gray"
        ? "#78898d"
        : undefined;
  if (staticColor && object.assetId.startsWith("vehicle."))
    return (
      <VehicleModel
        kind={object.assetId === "vehicle.suv.standard" ? "suv" : "sedan"}
        bodyColor={staticColor}
      />
    );
  if (!isSignal || scenario.signalChange === undefined) return <SceneModel object={object} />;
  return (
    <>
      <group ref={initial}>
        <SceneModel object={object} />
      </group>
      <group ref={changed} visible={false}>
        <SceneModel object={object} signal={nextSignal} />
      </group>
    </>
  );
}

function SupplementaryArrow({
  direction,
  playback,
  activeUntil,
}: {
  direction: "left" | "straight";
  playback: RefObject<Playback>;
  activeUntil?: number;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current)
      group.current.visible = activeUntil === undefined || playback.current.time < activeUntil;
  });
  return (
    <group
      ref={group}
      position={[0.62, 3.45, 0]}
      rotation-z={direction === "left" ? Math.PI / 2 : 0}
    >
      <mesh>
        <boxGeometry args={[0.62, 0.62, 0.3]} />
        <meshStandardMaterial color="#1f292f" />
      </mesh>
      <mesh position={[0, -0.04, 0.17]}>
        <boxGeometry args={[0.1, 0.3, 0.03]} />
        <meshBasicMaterial color="#57f179" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.17, 0.17]}>
        <coneGeometry args={[0.17, 0.28, 3]} />
        <meshBasicMaterial color="#57f179" toneMapped={false} />
      </mesh>
    </group>
  );
}

function InternalStopLine({ ticket }: { ticket: number }) {
  const position: [number, number, number] = ticket === 5 ? [2.4, 0.07, -9.6] : [-8, 0.07, -2.4];
  const scale: [number, number, number] = ticket === 5 ? [4.7, 0.035, 0.28] : [0.28, 0.035, 4.7];
  return (
    <mesh position={position} scale={scale} receiveShadow>
      <boxGeometry />
      <meshStandardMaterial color="#f4f2df" roughness={0.9} />
    </mesh>
  );
}

export default function TrainerScene(props: SceneProps) {
  const scene = props.scenario.scene;
  if (!scene) return null;
  const movingIds = new Set(props.scenario.cars.map((entry) => entry.sceneInstanceId));
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
      <SceneRenderer
        scene={scene}
        isVisible={(object) => !movingIds.has(object.instanceId)}
        renderModel={(object) => (
          <AnimatedSceneModel object={object} scenario={props.scenario} playback={props.playback} />
        )}
      />
      {props.scenario.number === 1 && (
        <group position={[5.8, 0, 9.2]}>
          <SupplementaryArrow direction="left" playback={props.playback} />
        </group>
      )}
      {props.scenario.number === 8 && (
        <group position={[5.8, 0, 9.2]}>
          <SupplementaryArrow
            direction="straight"
            playback={props.playback}
            activeUntil={props.scenario.signalChange}
          />
        </group>
      )}
      {(props.scenario.number === 5 || props.scenario.number === 6) && (
        <InternalStopLine ticket={props.scenario.number} />
      )}
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
