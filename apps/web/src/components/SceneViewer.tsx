"use client";
import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SceneEnvironment, SceneRenderer } from "@traffic-laws/scene-engine/react";
import type { SceneDefinition } from "@traffic-laws/scene-engine";
function SceneControls() {
  const { camera, gl, invalidate } = useThree();
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.minDistance = 15;
    controls.maxDistance = 110;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    const handleChange = () => invalidate();
    controls.addEventListener("change", handleChange);
    return () => {
      controls.removeEventListener("change", handleChange);
      controls.dispose();
    };
  }, [camera, gl, invalidate]);
  return null;
}
export default function SceneViewer({ scene }: { scene: SceneDefinition }) {
  return (
    <div className="ticket-scene" aria-label="Інтерактивна 3D-сцена">
      <Canvas
        frameloop="demand"
        shadows="soft"
        camera={{ position: [30, 45, 38], fov: 43, near: 0.1, far: 240 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <SceneEnvironment />
        <SceneRenderer scene={scene} />
        <SceneControls />
      </Canvas>
      <span className="scene-help">Інтерактивна 3D-сцена</span>
    </div>
  );
}
