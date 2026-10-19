import { validateScene, type SceneDefinition, type SceneObject } from "@traffic-laws/scene-engine";

type Signal = NonNullable<SceneObject["properties"]["signal"]>;

const transform = (
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
): SceneObject["transform"] => ({ position, rotation, scale: [1, 1, 1] });

const object = (
  instanceId: string,
  assetId: SceneObject["assetId"],
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
  properties: SceneObject["properties"] = {},
): SceneObject => ({ instanceId, assetId, transform: transform(position, rotation), properties });

const light = (
  instanceId: string,
  position: [number, number, number],
  yaw: number,
  signal: Signal,
) => object(instanceId, "traffic-light.standard", position, [0, yaw, 0], { signal });

const car = (
  instanceId: string,
  position: [number, number, number],
  yaw: number,
  kind: "sedan" | "suv" = "sedan",
) => object(instanceId, `vehicle.${kind}.standard`, position, [0, yaw, 0], { headlights: true });

function scene(id: string, name: string, objects: SceneObject[]): SceneDefinition {
  return validateScene({
    schemaVersion: 1,
    id,
    name,
    country: "UA",
    environment: { preset: "urban" },
    objects: [object("road", "intersection.city.standard", [0, 0, 0]), ...objects],
  });
}

const verticalGreen = [
  light("light-s", [5.8, 0, 9.2], 0, "green"),
  light("light-n", [-5.8, 0, -9.2], Math.PI, "green"),
  light("light-e", [9.2, 0, -5.8], Math.PI / 2, "red"),
  light("light-w", [-9.2, 0, 5.8], -Math.PI / 2, "red"),
];
const horizontalGreen = [
  light("light-s", [5.8, 0, 9.2], 0, "red"),
  light("light-n", [-5.8, 0, -9.2], Math.PI, "red"),
  light("light-e", [9.2, 0, -5.8], Math.PI / 2, "green"),
  light("light-w", [-9.2, 0, 5.8], -Math.PI / 2, "green"),
];

/** Validated Scene Definition snapshots authored for the five official-source reconstructions. */
export const OFFICIAL_TICKET_SCENES = {
  "ua-16-1-01": scene("ua-16-1-01", "Білет 16.1 №1 — реконструкція", [
    ...verticalGreen.map((entry) => ({
      ...entry,
      properties: { signal: entry.instanceId === "light-s" ? "red" : entry.properties.signal },
    })),
    car("car-white", [1.75, 0.02, 17], Math.PI),
    car("queue-dark", [-1.75, 0.02, 17], Math.PI, "suv"),
    car("queue-a", [1.75, 0.02, 23], Math.PI),
    car("queue-b", [-1.75, 0.02, 23], Math.PI, "suv"),
  ]),
  "ua-16-1-04": scene("ua-16-1-04", "Білет 16.1 №4 — реконструкція", [
    ...horizontalGreen,
    car("car-white", [1.5, 0.02, 0.5], -Math.PI * 0.75),
    car("waiting-gray", [-1.75, 0.02, -17], 0),
  ]),
  "ua-16-1-05": scene("ua-16-1-05", "Білет 16.1 №5 — реконструкція", [
    ...horizontalGreen,
    car("car-white", [-1.75, 0.02, -7.2], Math.PI),
  ]),
  "ua-16-1-06": scene("ua-16-1-06", "Білет 16.1 №6 — реконструкція", [
    ...horizontalGreen,
    car("car-green", [1.2, 0.02, 1.2], -Math.PI * 0.75, "suv"),
  ]),
  "ua-16-1-08": scene("ua-16-1-08", "Білет 16.1 №8 — реконструкція", [
    ...horizontalGreen,
    car("car-red", [-17, 0.02, 1.75], -Math.PI / 2),
    car("car-blue", [1.75, 0.02, 17], Math.PI),
    object("pedestrian-a", "character.man", [-6.7, 0.16, -7.5], [0, Math.PI / 2, 0]),
    object("pedestrian-b", "character.woman", [-8, 0.16, -7.5], [0, Math.PI / 2, 0]),
  ]),
} as const satisfies Record<string, SceneDefinition>;
