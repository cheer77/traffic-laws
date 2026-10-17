import { ASSET_DEFINITIONS } from "./definitions";
import measurements from "./measurements.json";
export { ASSET_CATEGORIES } from "./definitions";
export type { AssetCategory, AssetId } from "./definitions";

/** Metadata-only entry: importing this module does not instantiate Three.js resources. */
export const ASSET_REGISTRY = ASSET_DEFINITIONS.map((definition) => ({
  ...definition,
  version: "1.0.0",
  countryCompatibility: ["UA"] as const,
  countryCompatibilityNote:
    "Current project scope only; not a certification of legal compliance or livery accuracy.",
  ...measurements[definition.id],
  defaultScale: [1, 1, 1] as const,
  forwardAxis: "+Z" as const,
  upAxis: "+Y" as const,
  coordinateSystem: "right-handed" as const,
  units: "meters" as const,
  anchor: "original local origin; see boundingBox.min[1] for ground offset",
  source: {
    kind: "procedural" as const,
    path: `packages/assets-3d/src/${definition.source}`,
    origin: "Existing Studio source, extracted without redesign",
  },
  license: {
    status: "unspecified" as const,
    note: "No asset license declaration found in repository; internal reuse only, redistribution requires owner clarification.",
  },
}));
export type AssetMetadata = (typeof ASSET_REGISTRY)[number];
