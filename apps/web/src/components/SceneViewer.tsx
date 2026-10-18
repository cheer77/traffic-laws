"use client";
import { Canvas } from "@react-three/fiber";
import { SceneEnvironment, SceneRenderer } from "@traffic-laws/scene-engine/react";
import type { SceneDefinition } from "@traffic-laws/scene-engine";
export default function SceneViewer({ scene }: { scene: SceneDefinition }) {
  return (
    <div className="ticket-scene" aria-label="Інтерактивна 3D-сцена">
      <Canvas
        frameloop="demand"
        shadows="soft"
        camera={{ position: [32, 28, 38], fov: 43, near: 0.1, far: 240 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <SceneEnvironment />
        <SceneRenderer scene={scene} />
      </Canvas>
      <span className="scene-help">Перетягуйте для огляду · колесо для масштабу</span>
    </div>
  );
}
