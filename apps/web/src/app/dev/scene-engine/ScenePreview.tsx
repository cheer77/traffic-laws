"use client";
import { Canvas } from "@react-three/fiber";
import { createScene } from "@traffic-laws/scene-engine";
import { SceneEnvironment, SceneRenderer } from "@traffic-laws/scene-engine/react";
const scene = createScene();
export default function ScenePreview() {
  return (
    <div style={{ height: 640 }} aria-label="Сцена без залежності від Studio">
      <Canvas
        frameloop="demand"
        shadows="soft"
        camera={{ position: [32, 28, 38], fov: 43, near: 0.1, far: 240 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <SceneEnvironment />
        <SceneRenderer scene={scene} />
      </Canvas>
    </div>
  );
}
