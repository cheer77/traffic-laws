"use client";
import { ASSET_METADATA, scaleLimits, type Transform } from "@traffic-laws/scene-engine";
import { useComposerStore } from "@/stores/useComposerStore";
import { useStudioStore } from "@/stores/useStudioStore";
import { IDENTITY_TRANSFORM } from "@/lib/composer/operations";
import { NumberField } from "./NumberField";
import { selectAdded } from "@/lib/composer/navigation";
export function ObjectEditor() {
  const selected = useStudioStore((s) => s.selectedId),
    scene = useComposerStore((s) => s.scene),
    tool = useComposerStore((s) => s.tool);
  const object = scene.objects.find((object) => object.instanceId === selected);
  if (!object)
    return <p className="tool-note">Виберіть об’єкт на сцені або додайте його з бібліотеки.</p>;
  const state = useComposerStore.getState(),
    metadata = ASSET_METADATA.get(object.assetId)!;
  const [minScale, maxScale] = scaleLimits(object.assetId);
  const edit = (field: "position" | "rotation", index: number, value: string) => {
    if (!value.trim()) {
      state.reportError(new Error("Введіть число"));
      return;
    }
    const transform: Transform = { ...object.transform, [field]: [...object.transform[field]] };
    transform[field][index] = Number(value) * (field === "rotation" ? Math.PI / 180 : 1);
    state.transform(selected, transform);
  };
  return (
    <section className="object-editor" aria-label="Інспектор об’єкта">
      <h3>{metadata.name}</h3>
      <small>{selected}</small>
      <div className="composer-actions" aria-label="Інструмент трансформації">
        {(
          [
            ["select", "Вибір"],
            ["translate", "Переміщення"],
            ["rotate", "Поворот"],
          ] as const
        ).map(([value, label]) => (
          <button
            className="reset-button"
            key={value}
            aria-pressed={tool === value}
            onClick={() => state.setTool(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {(
        [
          ["position", "Позиція, м"],
          ["rotation", "Поворот, °"],
        ] as const
      ).map(([field, label]) => (
        <fieldset key={field}>
          <legend>{label}</legend>
          <div className="vector-inputs">
            {(["X", "Y", "Z"] as const).map((axis, index) => {
              const value =
                object.transform[field][index] * (field === "rotation" ? 180 / Math.PI : 1);
              return (
                <label key={axis}>
                  {axis}
                  <NumberField
                    key={`${selected}-${value}`}
                    label={`${label} ${axis}`}
                    value={value}
                    step={field === "rotation" ? 5 : 0.1}
                    min={field === "rotation" ? -360 : -100}
                    max={field === "rotation" ? 360 : 100}
                    onCommit={(value) => edit(field, index, value)}
                  />
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <label className="field-label" htmlFor="object-scale">
        Рівномірний масштаб · {minScale}–{maxScale}
      </label>
      <NumberField
        id="object-scale"
        key={`${selected}-${object.transform.scale[0]}`}
        label="Рівномірний масштаб"
        value={object.transform.scale[0]}
        step={0.1}
        min={minScale}
        max={maxScale}
        disabled={minScale === maxScale}
        onCommit={(text) => {
          const value = Number(text);
          state.transform(selected, { ...object.transform, scale: [value, value, value] });
        }}
      />
      {metadata.category === "traffic-lights" && (
        <>
          <label className="field-label" htmlFor="object-signal">
            Сигнал світлофора
          </label>
          <select
            id="object-signal"
            value={object.properties.signal ?? "red"}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "red" || value === "green" || value === "yellow" || value === "off")
                state.properties(selected, { signal: value });
            }}
          >
            <option value="red">Червоний</option>
            <option value="yellow">Жовтий</option>
            <option value="green">Зелений</option>
            <option value="off">Вимкнено</option>
          </select>
        </>
      )}
      {metadata.category === "vehicles" && (
        <label className="layer-row">
          Фари
          <input
            type="checkbox"
            role="switch"
            checked={object.properties.headlights ?? true}
            onChange={(event) => state.properties(selected, { headlights: event.target.checked })}
          />
        </label>
      )}
      <p className="tool-note">
        Габарити моделі: {metadata.dimensions.map((n) => n.toFixed(2)).join(" × ")} м.{" "}
        {minScale === maxScale
          ? "Це цілий комплект із фіксованим масштабом."
          : "Масштаб не змінює вихідну модель."}
      </p>
      <div className="composer-actions">
        <button
          className="reset-button"
          onClick={() => useStudioStore.getState().setCamera("focus")}
        >
          Фокус на об’єкті
        </button>
        <button className="reset-button" onClick={() => selectAdded(state.duplicate(selected))}>
          Дублювати
        </button>
        <button
          className="reset-button"
          onClick={() => state.transform(selected, IDENTITY_TRANSFORM)}
        >
          Скинути трансформацію
        </button>
        <button
          className="reset-button"
          onClick={() => {
            state.remove(selected);
            useStudioStore.setState({ selectedId: "", inspection: null });
          }}
        >
          Видалити об’єкт
        </button>
      </div>
    </section>
  );
}
