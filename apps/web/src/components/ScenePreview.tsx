"use client";
import dynamic from "next/dynamic";
import type { SceneDefinition } from "@traffic-laws/scene-engine";
const Viewer = dynamic(() => import("./SceneViewer"), {
  ssr: false,
  loading: () => <div className="ticket-scene scene-loading">Завантажуємо 3D-сцену…</div>,
});
export function ScenePreview({ scene }: { scene: SceneDefinition }) {
  return <Viewer scene={scene} />;
}
