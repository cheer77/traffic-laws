import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { ASSET_REGISTRY, ASSET_CATEGORIES } from "./registry";
import { ASSET_MODELS } from "./models";
import * as publicModels from "../index";
import manifest from "../../package.json";

describe("asset registry", () => {
  it("has unique stable IDs and exactly one renderer per registered model", () => {
    const ids = ASSET_REGISTRY.map((asset) => asset.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(ASSET_MODELS).sort()).toEqual([...ids].sort());
    expect(new Set(Object.values(ASSET_MODELS)).size).toBe(ids.length);
  });
  it.each(ASSET_REGISTRY)("validates metadata for $id", (asset) => {
    expect(ASSET_CATEGORIES).toContain(asset.category);
    expect(asset.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(asset.countryCompatibility).toEqual(["UA"]);
    expect(asset.defaultScale).toEqual([1, 1, 1]);
    expect([asset.units, asset.coordinateSystem, asset.forwardAxis, asset.upAxis]).toEqual([
      "meters",
      "right-handed",
      "+Z",
      "+Y",
    ]);
    expect(asset.dimensions).toHaveLength(3);
    expect(asset.boundingBox.min).toHaveLength(3);
    expect(asset.boundingBox.max).toHaveLength(3);
    asset.dimensions.forEach((value, axis) => {
      expect(Number.isFinite(value) && value > 0).toBe(true);
      expect(asset.boundingBox.max[axis] - asset.boundingBox.min[axis]).toBeCloseTo(value, 5);
    });
    expect(asset.performanceMetadata.triangles).toBeGreaterThan(0);
    expect(asset.performanceMetadata.drawCalls).toBeNull();
    expect(existsSync(new URL(`../../../../${asset.source.path}`, import.meta.url))).toBe(true);
  });
  it("exposes resolvable explicit public entry points", () => {
    for (const target of Object.values(manifest.exports))
      expect(existsSync(new URL(`../../${target}`, import.meta.url))).toBe(true);
    for (const name of [
      "VehicleModel",
      "Character",
      "Building",
      "Greenery",
      "StreetFurniture",
      "RoadSign",
      "TrafficLight",
      "IntersectionRoad",
    ])
      expect(publicModels).toHaveProperty(name);
    const metadata = readFileSync(new URL("./registry.ts", import.meta.url), "utf8");
    expect(metadata).not.toMatch(/from ["'](?:three|.*models)/);
  });
});
