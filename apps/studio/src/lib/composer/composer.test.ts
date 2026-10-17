import { beforeEach, describe, expect, it } from "vitest";
import { createScene, serializeScene } from "@traffic-laws/scene-engine";
import {
  addObject,
  duplicateObject,
  removeObject,
  updateObject,
  IDENTITY_TRANSFORM,
} from "./operations";
import { decodeWorkspace, encodeWorkspace, exportScene, importScene } from "./storage";
import { vehicleBoundsOverlaps } from "./overlaps";
import { changeMode, selectAdded } from "./navigation";
import { useComposerStore } from "@/stores/useComposerStore";
import { useStudioStore } from "@/stores/useStudioStore";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}
beforeEach(() => useStudioStore.getState().reset());
describe("composer operations and navigation", () => {
  it("adds, duplicates, updates and removes instances without mutating the source", () => {
    const original = createScene(),
      snapshot = serializeScene(original);
    const added = addObject(original, "vehicle.sedan.standard"),
      id = added.objects.at(-1)!.instanceId;
    const duplicate = duplicateObject(added, id),
      copy = duplicate.objects.at(-1)!;
    expect(new Set(duplicate.objects.map((o) => o.instanceId)).size).toBe(duplicate.objects.length);
    expect(copy.transform.position[0]).toBe(3);
    const moved = updateObject(duplicate, copy.instanceId, {
      transform: { ...IDENTITY_TRANSFORM, position: [4, 2, 3], rotation: [0, Math.PI / 2, 0] },
    });
    expect(moved.objects.at(-1)!.transform.rotation).toEqual([0, Math.PI / 2, 0]);
    expect(removeObject(moved, id).objects.some((o) => o.instanceId === id)).toBe(false);
    expect(serializeScene(original)).toBe(snapshot);
  });
  it("uses measured anchors and never splits collection batches", () => {
    const scene = addObject(createScene(), "vegetation.city.collection");
    expect(scene.objects.at(-1)!.transform).toEqual(IDENTITY_TRANSFORM);
    expect(scene.objects).toHaveLength(27);
  });
  it("keeps state and references intact on invalid transforms and JSON", () => {
    const state = useComposerStore.getState(),
      original = state.scene;
    state.transform("vehicle-sedan", { ...IDENTITY_TRANSFORM, position: [Infinity, 0, 0] });
    expect(useComposerStore.getState().scene).toBe(original);
    expect(state.loadJSON('{"schemaVersion":2}')).toBe(false);
    expect(useComposerStore.getState().scene).toBe(original);
    expect(useComposerStore.getState().error).not.toBe("");
  });
  it("preserves edits and editor selection through library Preview and view", () => {
    const state = useComposerStore.getState();
    selectAdded(state.add("vehicle.sedan.standard"));
    const id = useStudioStore.getState().selectedId;
    state.transform(id, { ...IDENTITY_TRANSFORM, position: [5, 0, 5] });
    const scene = useComposerStore.getState().scene;
    changeMode("library");
    useStudioStore.getState().selectObject("vehicle-police");
    useStudioStore.getState().setPreview(true);
    changeMode("editor");
    expect(useStudioStore.getState().preview).toBe(false);
    expect(useStudioStore.getState().selectedId).toBe(id);
    expect(useComposerStore.getState().scene).toBe(scene);
    changeMode("view");
    changeMode("editor");
    expect(useComposerStore.getState().scene).toBe(scene);
  });
  it("round-trips JSON, draft and saved scenes through storage and reload", () => {
    const storage = memoryStorage(),
      state = useComposerStore.getState();
    state.hydrate(storage);
    state.add("sign.priority.stop.ua");
    state.save();
    state.persist(storage);
    const saved = useComposerStore.getState().scene;
    expect(importScene(exportScene(saved))).toEqual(saved);
    state.reset();
    useComposerStore.getState().hydrate(storage);
    expect(useComposerStore.getState().scene).toEqual(saved);
    expect(useComposerStore.getState().saved).toEqual([saved]);
    expect(decodeWorkspace(encodeWorkspace({ draft: saved, saved: [saved] }))).toEqual({
      draft: saved,
      saved: [saved],
    });
  });
  it("handles malformed storage and quota errors without destroying a draft", () => {
    const state = useComposerStore.getState(),
      draft = state.scene;
    const broken = memoryStorage();
    broken.getItem = () => "broken";
    state.hydrate(broken);
    expect(useComposerStore.getState().storageEnabled).toBe(false);
    expect(useComposerStore.getState().scene).toBe(draft);
    state.reset();
    const quota = memoryStorage();
    quota.setItem = () => {
      throw new Error("quota");
    };
    state.hydrate(quota);
    state.persist(quota);
    expect(useComposerStore.getState().error).toContain("localStorage");
  });
  it("keeps saved snapshots independent from editing and restores preset", () => {
    const state = useComposerStore.getState();
    state.save();
    state.remove("vehicle-sedan");
    expect(useComposerStore.getState().saved[0].objects).toHaveLength(26);
    state.restore();
    expect(useComposerStore.getState().scene.objects).toHaveLength(26);
    state.newScene();
    expect(useComposerStore.getState().scene.id).not.toBe(createScene().id);
    state.loadSaved(createScene().id);
    expect(useComposerStore.getState().scene).toEqual(createScene());
  });
  it("reports transformed vehicle AABB overlaps as an advisory", () => {
    const original = createScene();
    expect(vehicleBoundsOverlaps(original)).toEqual([]);
    const sedan = original.objects.find((o) => o.instanceId === "vehicle-sedan")!;
    const overlap = updateObject(original, "vehicle-suv", { transform: sedan.transform });
    expect(vehicleBoundsOverlaps(overlap)).toContainEqual(["vehicle-sedan", "vehicle-suv"]);
  });
});
