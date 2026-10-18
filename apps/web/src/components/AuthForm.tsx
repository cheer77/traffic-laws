"use client";
import { useActionState } from "react";
import type { FormState } from "@/app/actions";
export function AuthForm({
  action,
  mode,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  mode: "login" | "register";
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  return (
    <form action={formAction} className="auth-form">
      <label>
        Електронна пошта
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </label>
      <label>
        Пароль
        <input
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={15}
          required
          placeholder="Щонайменше 15 символів"
        />
      </label>
      {mode === "register" && (
        <label className="check">
          <input name="consent" type="checkbox" required />
          <span>
            Я розумію, що це навчальний MVP, а матеріали не замінюють офіційний текст ПДР.
          </span>
        </label>
      )}
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="button button-wide" disabled={pending}>
        {pending ? "Зачекайте…" : mode === "login" ? "Увійти" : "Створити акаунт"}
      </button>
    </form>
  );
}
