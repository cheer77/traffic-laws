"use client";
import dynamic from "next/dynamic";
const Preview =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("./AssetPreview"), {
        ssr: false,
        loading: () => <p>Завантаження моделі…</p>,
      })
    : () => null;
export default function AssetCheck() {
  return process.env.NODE_ENV === "development" ? <Preview /> : null;
}
