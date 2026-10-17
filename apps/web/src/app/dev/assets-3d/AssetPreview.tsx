"use client";
import { Canvas } from "@react-three/fiber";
import { VehicleModel } from "@traffic-laws/assets-3d/vehicles/VehicleModel";
export default function AssetPreview() {
  return (
    <div style={{ height: 480 }} aria-label="Незалежний перегляд седана">
      <Canvas
        frameloop="demand"
        camera={{ position: [6, 4, 7] }}
        onCreated={({ camera }) => camera.lookAt(0, 1, 0)}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[4, 8, 5]} intensity={3} />
        <VehicleModel kind="sedan" />
      </Canvas>
    </div>
  );
}
