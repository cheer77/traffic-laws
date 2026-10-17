"use client";
import { useEffect, useMemo, useRef } from "react";
import {
  ASSET_METADATA,
  MAX_JSON_BYTES,
  SCENE_PRESETS,
  serializeScene,
} from "@traffic-laws/scene-engine";
import { useComposerStore } from "@/stores/useComposerStore";
import { useStudioStore } from "@/stores/useStudioStore";
import { changeMode } from "@/lib/composer/navigation";
import { vehicleBoundsOverlaps } from "@/lib/composer/overlaps";
import { ObjectEditor } from "./ObjectEditor";

export function ComposerPersistence() {
  useEffect(() => {
    try {
      useComposerStore.getState().hydrate(window.localStorage);
    } catch (error) {
      useComposerStore.getState().reportError(error);
    }
    const unsubscribe = useComposerStore.subscribe((state, previous) => {
      if (state.scene !== previous.scene || state.saved !== previous.saved) {
        try {
          state.persist(window.localStorage);
        } catch (error) {
          state.reportError(error);
        }
      }
    });
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!useComposerStore.getState().storageEnabled) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      unsubscribe();
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, []);
  return null;
}
export const MODE_LABELS = {
  scenes: "Сцени",
  editor: "Редактор",
  library: "Бібліотека 3D",
  view: "Перегляд",
} as const;
export function ModeNavigation() {
  const mode = useComposerStore((s) => s.mode),
    preview = useStudioStore((s) => s.preview);
  return (
    <div className="composer-navigation">
      <nav aria-label="Режим Studio">
        {(Object.keys(MODE_LABELS) as Array<keyof typeof MODE_LABELS>).map((key) => (
          <button
            key={key}
            aria-current={mode === key ? "page" : undefined}
            onClick={() => changeMode(key)}
          >
            {MODE_LABELS[key]}
          </button>
        ))}
      </nav>
      {(mode !== "editor" || preview) && (
        <button className="reset-button tool-button" onClick={() => changeMode("editor")}>
          ← Повернутися до сцени
        </button>
      )}
    </div>
  );
}
export function ComposerPanel() {
  const scene = useComposerStore((s) => s.scene),
    saved = useComposerStore((s) => s.saved),
    mode = useComposerStore((s) => s.mode);
  const message = useComposerStore((s) => s.message),
    error = useComposerStore((s) => s.error),
    storage = useComposerStore((s) => s.storageEnabled);
  const selected = useStudioStore((s) => s.selectedId);
  const overlaps = useMemo(() => vehicleBoundsOverlaps(scene), [scene]);
  const file = useRef<HTMLInputElement>(null);
  const state = useComposerStore.getState();
  const dirty = !saved.some(
    (item) => item.id === scene.id && serializeScene(item) === serializeScene(scene),
  );
  const confirmReplace = () =>
    !dirty ||
    window.confirm(
      "Замінити поточну сцену? Незбережені зміни буде втрачено. Перед цим можна зберегти сцену або експортувати JSON.",
    );
  const replace = (action: () => void) => {
    if (confirmReplace()) {
      action();
      changeMode("editor");
      useStudioStore.getState().setCamera("iso");
    }
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([serializeScene(scene)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${scene.id}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="composer-content">
      <p className="tool-note">
        {storage
          ? "Чернетка зберігається автоматично в цьому браузері."
          : "Для надійного збереження експортуйте JSON."}{" "}
        {dirty ? "Є зміни відносно збережених сцен." : "Сцену збережено."}
      </p>
      {error && (
        <p className="composer-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="composer-message" role="status">
          {message}
        </p>
      )}
      {mode !== "view" && (
        <>
          <label className="field-label" htmlFor="scene-name">
            Назва сцени
          </label>
          <input
            id="scene-name"
            key={scene.id + scene.name}
            defaultValue={scene.name}
            maxLength={120}
            onBlur={(event) => {
              state.rename(event.target.value);
              event.target.value = useComposerStore.getState().scene.name;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
          <div className="composer-actions">
            <button className="reset-button" onClick={state.save}>
              Зберегти сцену
            </button>
            <button className="reset-button" onClick={download}>
              Export JSON
            </button>
            <button className="reset-button" onClick={() => file.current?.click()}>
              Import JSON
            </button>
          </div>
          <input
            ref={file}
            className="composer-file"
            aria-label="Імпорт JSON сцени"
            type="file"
            accept=".json,application/json"
            onChange={async (event) => {
              const source = event.target.files?.[0];
              event.target.value = "";
              if (!source) return;
              try {
                if (source.size > MAX_JSON_BYTES) throw new Error("Файл перевищує 1 МБ");
                const text = await source.text();
                // Validate before asking to replace or mutating any state.
                const { parseSceneJSON } = await import("@traffic-laws/scene-engine");
                parseSceneJSON(text);
                if (confirmReplace() && state.loadJSON(text)) {
                  changeMode("editor");
                  useStudioStore.getState().setCamera("iso");
                }
              } catch (error) {
                state.reportError(error);
              }
            }}
          />
        </>
      )}
      {mode === "scenes" ? (
        <>
          <h3 className="section-label">Пресети</h3>
          {SCENE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              className="reset-button tool-button"
              onClick={() => replace(() => state.newScene(preset.id))}
            >
              Нова сцена · {preset.name}
            </button>
          ))}
          <h3 className="section-label">Збережені сцени · {saved.length}</h3>
          {saved.length === 0 && <p className="tool-note">Збережених сцен ще немає.</p>}
          {saved.map((item) => (
            <div key={item.id} className="saved-scene">
              <button
                className="reset-button"
                onClick={() => replace(() => state.loadSaved(item.id))}
              >
                {item.name}
              </button>
              <button
                className="icon-button"
                aria-label={`Видалити збережену сцену ${item.name}`}
                onClick={() => {
                  if (
                    window.confirm(
                      `Видалити збережену сцену «${item.name}»? Поточна чернетка залишиться.`,
                    )
                  )
                    state.deleteSaved(item.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
          <p className="tool-note">
            localStorage — локальне тимчасове сховище. JSON — переносна копія. Публікації та
            спільної роботи немає.
          </p>
        </>
      ) : mode === "editor" ? (
        <>
          <div className="composer-actions">
            <button className="reset-button" onClick={() => changeMode("library")}>
              + Додати об’єкт
            </button>
            <button className="reset-button" onClick={() => replace(state.restore)}>
              Відновити пресет
            </button>
          </div>
          <label className="field-label" htmlFor="scene-object">
            Об’єкти сцени · {scene.objects.length}
          </label>
          <select
            id="scene-object"
            value={scene.objects.some((o) => o.instanceId === selected) ? selected : ""}
            onChange={(event) => useStudioStore.getState().selectObject(event.target.value)}
          >
            <option value="" disabled>
              Виберіть об’єкт
            </option>
            {scene.objects.map((object) => (
              <option key={object.instanceId} value={object.instanceId}>
                {ASSET_METADATA.get(object.assetId)!.name} · {object.instanceId}
              </option>
            ))}
          </select>
          <ObjectEditor />
          {overlaps.length > 0 && (
            <p className="tool-note" role="status">
              Перетин габаритів транспорту: {overlaps.length}.{" "}
              {overlaps
                .slice(0, 3)
                .map((pair) => pair.join(" / "))
                .join("; ")}
              . Це лише AABB-підказка, не перевірка зіткнень або ПДР.
            </p>
          )}
        </>
      ) : mode === "view" ? (
        <p className="tool-note">
          Підсумкова сцена без інструментів редагування. Усі об’єкти конфігурації видимі.
        </p>
      ) : null}
    </div>
  );
}
