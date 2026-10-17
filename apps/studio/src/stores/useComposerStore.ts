import { create } from "zustand";
import {
  createScene,
  validateScene,
  type SceneDefinition,
  type SceneObject,
  type ScenePresetId,
  type Transform,
} from "@traffic-laws/scene-engine";
import type { AssetId } from "@traffic-laws/assets-3d/registry";
import { addObject, duplicateObject, removeObject, updateObject } from "@/lib/composer/operations";
import {
  decodeWorkspace,
  encodeWorkspace,
  importScene,
  MAX_SAVED_SCENES,
  STORAGE_KEY,
} from "@/lib/composer/storage";
export type ComposerMode = "scenes" | "editor" | "library" | "view";
interface ComposerState {
  editorSelection: string;
  scene: SceneDefinition;
  saved: SceneDefinition[];
  mode: ComposerMode;
  tool: "select" | "translate" | "rotate";
  dragging: boolean;
  hydrated: boolean;
  storageEnabled: boolean;
  message: string;
  error: string;
  setMode: (mode: ComposerMode) => void;
  setTool: (tool: ComposerState["tool"]) => void;
  setDragging: (dragging: boolean) => void;
  add: (id: AssetId) => string | undefined;
  duplicate: (id: string) => string | undefined;
  remove: (id: string) => void;
  transform: (id: string, transform: Transform) => void;
  properties: (id: string, properties: SceneObject["properties"]) => void;
  rename: (name: string) => void;
  loadJSON: (json: string) => boolean;
  save: () => void;
  loadSaved: (id: string) => void;
  deleteSaved: (id: string) => void;
  newScene: (preset?: ScenePresetId) => void;
  restore: () => void;
  hydrate: (storage: Storage) => void;
  persist: (storage: Storage) => void;
  reset: () => void;
  reportError: (error: unknown) => void;
}
const initial = () => ({
  editorSelection: "vehicle-sedan",
  scene: createScene(),
  saved: [],
  mode: "editor" as const,
  tool: "select" as const,
  dragging: false,
  hydrated: false,
  storageEnabled: false,
  message: "",
  error: "",
});
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Не вдалося виконати операцію";
export const useComposerStore = create<ComposerState>((set, get) => {
  const edit = (
    operation: (scene: SceneDefinition) => SceneDefinition,
  ): SceneDefinition | undefined => {
    try {
      const scene = operation(get().scene);
      set({ scene, error: "", message: "" });
      return scene;
    } catch (error) {
      set({ error: errorMessage(error) });
    }
  };
  return {
    ...initial(),
    setMode: (mode) => set({ mode, dragging: false }),
    setTool: (tool) => set({ tool }),
    setDragging: (dragging) => set({ dragging }),
    add: (id) => edit((scene) => addObject(scene, id))?.objects.at(-1)?.instanceId,
    duplicate: (id) => edit((scene) => duplicateObject(scene, id))?.objects.at(-1)?.instanceId,
    remove: (id) => {
      edit((scene) => removeObject(scene, id));
    },
    transform: (id, transform) => {
      edit((scene) => updateObject(scene, id, { transform }));
    },
    properties: (id, properties) => {
      edit((scene) => updateObject(scene, id, { properties }));
    },
    rename: (name) => {
      if (name !== get().scene.name) edit((scene) => validateScene({ ...scene, name }));
    },
    loadJSON: (json) => {
      try {
        const scene = importScene(json);
        set({ scene, mode: "editor", error: "", message: "JSON завантажено" });
        return true;
      } catch (error) {
        set({ error: errorMessage(error) });
        return false;
      }
    },
    save: () => {
      const { scene, saved } = get();
      if (saved.length >= MAX_SAVED_SCENES && !saved.some((item) => item.id === scene.id)) {
        set({ error: "Ліміт: 20 сцен. Експортуйте JSON або видаліть зайві записи." });
        return;
      }
      set({
        saved: [...saved.filter((item) => item.id !== scene.id), validateScene(scene)],
        error: "",
        message: get().storageEnabled
          ? "Сцену збережено в цьому браузері"
          : "Знімок сцени в пам’яті. Експортуйте JSON: localStorage недоступне.",
      });
    },
    loadSaved: (id) => {
      const scene = get().saved.find((scene) => scene.id === id);
      if (scene)
        set({ scene: validateScene(scene), mode: "editor", error: "", message: "Сцену відкрито" });
    },
    deleteSaved: (id) =>
      set((state) => ({ saved: state.saved.filter((scene) => scene.id !== id) })),
    newScene: (preset = "urban-intersection") =>
      set({
        scene: { ...createScene(preset), id: `scene-${crypto.randomUUID()}` },
        mode: "editor",
        error: "",
        message: "Створено з пресета",
      }),
    restore: () =>
      set((state) => ({
        scene: { ...createScene(), id: state.scene.id, name: state.scene.name },
        error: "",
        message: "Відновлено початкове розміщення",
      })),
    hydrate: (storage) => {
      if (get().hydrated) return;
      try {
        const raw = storage.getItem(STORAGE_KEY);
        const workspace = raw ? decodeWorkspace(raw) : null;
        set({
          ...(workspace ? { scene: workspace.draft, saved: workspace.saved } : {}),
          hydrated: true,
          storageEnabled: true,
          message: raw ? "Чернетку відновлено" : "",
        });
      } catch (error) {
        set({
          hydrated: true,
          storageEnabled: false,
          error: `Автозбереження недоступне: ${errorMessage(error)}. Використайте JSON. Старі дані не перезаписано.`,
        });
      }
    },
    persist: (storage) => {
      if (!get().hydrated || !get().storageEnabled) return;
      try {
        const state = get();
        storage.setItem(STORAGE_KEY, encodeWorkspace({ draft: state.scene, saved: state.saved }));
      } catch {
        set({
          storageEnabled: false,
          error: "Не вдалося записати localStorage. Експортуйте JSON для збереження.",
        });
      }
    },
    reset: () => set(initial()),
    reportError: (error) => set({ error: errorMessage(error) }),
  };
});
