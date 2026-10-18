"use client";
import dynamic from "next/dynamic";
import type { SceneDefinition } from "@traffic-laws/scene-engine";
const Viewer = dynamic(() => import("./SceneViewer"), {
  ssr: false,
  loading: () => <p>Завантаження 3D-сцени…</p>,
});
export function ScenePreview({ scene }: { scene: SceneDefinition }) {
  return (
    <div style={{ height: 420 }} aria-label="Перегляд 3D-сцени">
      <Viewer scene={scene} />
    </div>
  );
}
