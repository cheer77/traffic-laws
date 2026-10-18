"use client";
import { useActionState } from "react";
import { syncQuestionsAction, type FormState } from "@/app/actions";

export function ImportAction({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(syncQuestionsAction, {
    error: null,
  });
  return (
    <form action={action}>
      <button className="button" disabled={disabled || pending}>
        {pending ? "Перевіряємо джерело…" : "Імпортувати / Оновити питання"}
      </button>
      {state.error && <p className="alert">{state.error}</p>}
      {state.success && <p className="notice">{state.success}</p>}
    </form>
  );
}
