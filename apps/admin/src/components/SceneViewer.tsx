"use client";
import { Canvas } from "@react-three/fiber";
import { SceneRenderer } from "@traffic-laws/scene-engine/react";
import type { SceneDefinition } from "@traffic-laws/scene-engine";
export default function SceneViewer({ scene }: { scene: SceneDefinition }) {
  return (
    <Canvas
      frameloop="demand"
      shadows="soft"
      camera={{ position: [32, 28, 38], fov: 43, near: 0.1, far: 240 }}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[20, 30, 10]} intensity={2.2} />
      <SceneRenderer scene={scene} />
    </Canvas>
  );
}
