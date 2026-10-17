import { ASSET_REGISTRY, type AssetId } from "@traffic-laws/assets-3d/registry";

import type { VehicleKind } from "@traffic-laws/assets-3d/types";
export const VEHICLE_KINDS: Partial<Record<AssetId, VehicleKind>> = {
  "vehicle.sedan.standard": "sedan",
  "vehicle.suv.standard": "suv",
  "vehicle.motorcycle.standard": "motorcycle",
  "vehicle.ambulance.ua": "ambulance",
  "vehicle.police.ua": "police",
  "vehicle.fire-truck.ua": "fire",
};

export type Vector3 = [number, number, number];
export interface Transform {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
}
export interface SceneObject {
  instanceId: string;
  assetId: AssetId;
  transform: Transform;
  properties: { headlights?: boolean; signal?: "red" | "yellow" | "green" | "off" };
}
export interface SceneDefinition {
  schemaVersion: 1;
  id: string;
  name: string;
  country: "UA";
  environment: { preset: "urban" };
  objects: SceneObject[];
}
export const MAX_OBJECTS = 200;
export const MAX_JSON_BYTES = 1_000_000;
export const ASSET_METADATA = new Map(ASSET_REGISTRY.map((asset) => [asset.id, asset]));
export class SceneValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SceneValidationError";
  }
}
function fail(path: string, message: string): never {
  throw new SceneValidationError(`${path}: ${message}`);
}
function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "очікується об’єкт");
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[], path: string) {
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) fail(path, `невідоме поле «${key}»`);
}
function identifier(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(value))
    fail(path, "ID має містити 1–80 латинських літер, цифр, крапок, дефісів або підкреслень");
  return value;
}
function vector(value: unknown, path: string, min: number, max: number): Vector3 {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    !Array.from(value).every(
      (n) => typeof n === "number" && Number.isFinite(n) && n >= min && n <= max,
    )
  )
    fail(path, `потрібні три скінченні числа від ${min} до ${max}`);
  return [value[0], value[1], value[2]];
}
/** Urban collections are authored as fixed batches. Scaling them distorts the shared road geometry. */
export function scaleLimits(assetId: AssetId): [number, number] {
  const category = ASSET_METADATA.get(assetId)!.category;
  return ["intersections", "vegetation", "street-furniture"].includes(category) ? [1, 1] : [0.5, 2];
}
/** Parse by reconstruction: no UI fields or references survive the trust boundary. Rotations use radians, Euler XYZ. */
export function validateScene(input: unknown): SceneDefinition {
  const source = record(input, "Сцена");
  keys(source, ["schemaVersion", "id", "name", "country", "environment", "objects"], "Сцена");
  if (source.schemaVersion !== 1)
    fail("schemaVersion", "підтримується лише версія 1; потрібна явна міграція");
  const id = identifier(source.id, "id");
  if (typeof source.name !== "string" || !source.name.trim() || source.name.length > 120)
    fail("name", "назва має містити 1–120 символів");
  if (source.country !== "UA") fail("country", "підтримується лише UA");
  const environment = record(source.environment, "environment");
  keys(environment, ["preset"], "environment");
  if (environment.preset !== "urban") fail("environment.preset", "невідомий пресет середовища");
  if (!Array.isArray(source.objects) || source.objects.length > MAX_OBJECTS)
    fail("objects", `очікується масив до ${MAX_OBJECTS} об’єктів`);
  const ids = new Set<string>();
  const objects = Array.from(source.objects).map((value: unknown, index: number): SceneObject => {
    const path = `objects[${index}]`,
      object = record(value, path);
    keys(object, ["instanceId", "assetId", "transform", "properties"], path);
    const instanceId = identifier(object.instanceId, `${path}.instanceId`);
    if (ids.has(instanceId)) fail(path, `повторний instanceId «${instanceId}»`);
    ids.add(instanceId);
    const asset = ASSET_REGISTRY.find((asset) => asset.id === object.assetId);
    if (!asset) fail(path, `невідомий assetId «${String(object.assetId).slice(0, 100)}»`);
    const transform = record(object.transform, `${path}.transform`);
    keys(transform, ["position", "rotation", "scale"], `${path}.transform`);
    const position = vector(transform.position, `${path}.position`, -100, 100);
    const rotation = vector(transform.rotation, `${path}.rotation`, -Math.PI * 2, Math.PI * 2);
    const [min, max] = scaleLimits(asset.id);
    const scale = vector(transform.scale, `${path}.scale`, min, max);
    if (scale[0] !== scale[1] || scale[1] !== scale[2])
      fail(path, "масштаб має бути рівномірним по всіх осях");
    const rawProperties = record(object.properties, `${path}.properties`);
    const properties: SceneObject["properties"] = {};
    keys(
      rawProperties,
      asset.category === "vehicles"
        ? ["headlights"]
        : asset.category === "traffic-lights"
          ? ["signal"]
          : [],
      `${path}.properties`,
    );
    if ("headlights" in rawProperties) {
      if (typeof rawProperties.headlights !== "boolean") fail(path, "headlights має бути boolean");
      properties.headlights = rawProperties.headlights;
    }
    if ("signal" in rawProperties) {
      const signal = rawProperties.signal;
      if (signal !== "red" && signal !== "yellow" && signal !== "green" && signal !== "off")
        fail(path, "невідомий сигнал світлофора");
      properties.signal = signal;
    }
    return { instanceId, assetId: asset.id, transform: { position, rotation, scale }, properties };
  });
  return {
    schemaVersion: 1,
    id,
    name: source.name,
    country: "UA",
    environment: { preset: "urban" },
    objects,
  };
}
export function parseSceneJSON(json: string): SceneDefinition {
  if (new TextEncoder().encode(json).length > MAX_JSON_BYTES) fail("JSON", "файл перевищує 1 МБ");
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    fail("JSON", "некоректний синтаксис файлу");
  }
  return validateScene(value);
}
export function serializeScene(scene: SceneDefinition): string {
  return JSON.stringify(validateScene(scene), null, 2);
}
