"use client";
import { useState } from "react";
/** Parent keys this field by instance and canonical value. Unchanged display rounding never edits data. */
export function NumberField({
  value,
  label,
  min,
  max,
  step,
  disabled = false,
  onCommit,
  id,
}: {
  value: number;
  label: string;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onCommit: (text: string) => void;
  id?: string;
}) {
  const display = String(Number(value.toFixed(4)));
  const [draft, setDraft] = useState(display);
  return (
    <input
      id={id}
      aria-label={label}
      type="number"
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft !== display) onCommit(draft);
        setDraft(display);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(display);
        }
      }}
    />
  );
}
