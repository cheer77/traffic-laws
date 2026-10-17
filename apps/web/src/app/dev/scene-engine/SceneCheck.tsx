"use client";
import dynamic from "next/dynamic";
const Preview =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("./ScenePreview"), { ssr: false })
    : () => null;
export default function SceneCheck() {
  return process.env.NODE_ENV === "development" ? <Preview /> : null;
}
