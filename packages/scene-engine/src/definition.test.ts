import { describe, expect, it } from "vitest";
import {
  createScene,
  parseSceneJSON,
  serializeScene,
  validateScene,
  MAX_JSON_BYTES,
  MAX_OBJECTS,
} from "./index";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

describe("scene definition boundary", () => {
  it("round-trips canonical configuration without UI state and creates independent presets", () => {
    const scene = createScene();
    expect(parseSceneJSON(serializeScene(scene))).toEqual(scene);
    expect(serializeScene(parseSceneJSON(serializeScene(scene)))).toBe(serializeScene(scene));
    scene.objects[0].transform.position[0] = 12;
    expect(createScene().objects[0].transform.position[0]).toBe(0);
  });
  it.each([null, [], {}, "scene", 1])("rejects malformed roots %s", (value) =>
    expect(() => validateScene(value)).toThrow(),
  );
  it.each([0, 2, "1", null])("rejects incompatible version %s", (version) =>
    expect(() => validateScene({ ...createScene(), schemaVersion: version })).toThrow(/версія/),
  );
  it("rejects unknown assets and duplicate instance IDs", () => {
    const scene = createScene();
    expect(() =>
      validateScene({ ...scene, objects: [{ ...scene.objects[0], assetId: "unknown" }] }),
    ).toThrow(/assetId/);
    expect(() =>
      validateScene({ ...scene, objects: [scene.objects[0], scene.objects[0]] }),
    ).toThrow(/повторний/);
  });
  it.each([NaN, Infinity, -Infinity, "1", null, 101])("rejects invalid coordinates %s", (value) => {
    const scene = createScene(),
      object = scene.objects[0];
    expect(() =>
      validateScene({
        ...scene,
        objects: [{ ...object, transform: { ...object.transform, position: [value, 0, 0] } }],
      }),
    ).toThrow(/скінченні/);
  });
  it.each([
    [0, 0, 0],
    [-1, -1, -1],
    [3, 3, 3],
    [1, 2, 1],
    [1, 1],
    [1, 1, 1, 1],
  ])("rejects invalid scale %s", (...scale) => {
    const scene = createScene(),
      object = scene.objects.at(-1)!;
    expect(() =>
      validateScene({
        ...scene,
        objects: [{ ...object, transform: { ...object.transform, scale } }],
      }),
    ).toThrow();
  });
  it("limits scene size, input bytes, batch scale, schema fields, and static properties", () => {
    const scene = createScene(),
      object = scene.objects[0];
    expect(() => parseSceneJSON(" ".repeat(MAX_JSON_BYTES + 1))).toThrow(/1 МБ/);
    expect(() =>
      validateScene({
        ...scene,
        objects: Array.from({ length: MAX_OBJECTS + 1 }, (_, i) => ({
          ...object,
          instanceId: `id-${i}`,
        })),
      }),
    ).toThrow(/200/);
    expect(() => validateScene({ ...scene, selectedId: "road" })).toThrow(/невідоме поле/);
    expect(() =>
      validateScene({ ...scene, objects: [{ ...object, properties: { signal: "green" } }] }),
    ).toThrow();
    expect(() =>
      validateScene({
        ...scene,
        objects: [{ ...object, transform: { ...object.transform, scale: [0.5, 0.5, 0.5] } }],
      }),
    ).toThrow();
    expect(() => parseSceneJSON('{"schemaVersion":')).toThrow(/синтаксис/);
    expect(() => validateScene({ ...scene, environment: { preset: "roundabout" } })).toThrow(
      /пресет/,
    );
    expect(() => validateScene({ ...scene, country: "ES" })).toThrow(/UA/);
  });
  it("does not silently drop malicious, unsupported or incorrectly typed properties", () => {
    const scene = createScene();
    const raw = serializeScene(scene).replace(
      '"properties": {}',
      '"properties": {"__proto__": {"polluted": true}}',
    );
    expect(() => parseSceneJSON(raw)).toThrow(/невідоме поле/);
    for (const object of scene.objects) {
      if (object.assetId.startsWith("vehicle."))
        expect(() =>
          validateScene({
            ...scene,
            objects: [{ ...object, properties: { headlights: "false" } }],
          }),
        ).toThrow(/boolean/);
      if (object.assetId === "traffic-light.standard")
        expect(() =>
          validateScene({ ...scene, objects: [{ ...object, properties: { signal: "purple" } }] }),
        ).toThrow(/сигнал/);
    }
  });
  it("has no application, editor, Zustand or Next runtime dependencies", () => {
    for (const file of readdirSync(join(import.meta.dirname))) {
      if (!/\.tsx?$/.test(file) || file.includes("test")) continue;
      const source = readFileSync(join(import.meta.dirname, file), "utf8");
      expect(source).not.toMatch(/from ["'](?:@\/|.*apps\/|zustand|next|@react-three\/drei)/);
      if (file !== "SceneRenderer.tsx")
        expect(source).not.toMatch(/from ["'](?:react|three|@react-three\/fiber)/);
    }
  });
});
