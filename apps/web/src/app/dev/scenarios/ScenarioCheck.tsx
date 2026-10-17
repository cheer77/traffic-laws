"use client";
import dynamic from "next/dynamic";
const Preview =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("./ScenarioPreview"), { ssr: false })
    : () => null;
export default function ScenarioCheck() {
  return process.env.NODE_ENV === "development" ? <Preview /> : null;
}
