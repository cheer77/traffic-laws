"use client";
import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions";
import { loginAction, saveScenarioAction } from "@/app/actions";

const initial: FormState = { error: null };
export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <form action={action}>
      <label htmlFor="email">Електронна пошта</label>
      <input id="email" name="email" type="email" autoComplete="username" required />
      <label htmlFor="password">Пароль</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        minLength={15}
        required
      />
      {state.error && (
        <p role="alert" className="alert">
          {state.error}
        </p>
      )}
      <button className="button" disabled={pending}>
        {pending ? "Вхід…" : "Увійти"}
      </button>
    </form>
  );
}
export function ScenarioForm({
  payload,
  expectedRevision,
}: {
  payload: string;
  expectedRevision: number;
}) {
  const [state, action, pending] = useActionState(saveScenarioAction, initial);
  const [text, setText] = useState(payload);
  return (
    <form action={action}>
      <input type="hidden" name="expectedRevision" value={expectedRevision} />
      <label htmlFor="payload">Сценарій JSON v1</label>
      <textarea
        id="payload"
        name="payload"
        value={text}
        onChange={(event) => setText(event.target.value)}
        required
        spellCheck={false}
      />
      <p className="muted">
        Валідація виконується спільним пакетом сценаріїв. Збереження створює нову незмінну ревізію.
      </p>
      {state.error && (
        <p role="alert" className="alert">
          {state.error}
        </p>
      )}
      <button className="button" disabled={pending}>
        {pending ? "Збереження…" : "Зберегти ревізію"}
      </button>
    </form>
  );
}
