"use client";
import { useActionState } from "react";
import { reviewAction, type FormState } from "@/app/actions";
export function ReviewForm({ id, revision }: { id: string; revision: number }) {
  const action = reviewAction.bind(null, id, revision);
  const [state, submit, pending] = useActionState<FormState, FormData>(action, { error: null });
  return (
    <form action={submit}>
      <label htmlFor="decision">Рекомендація</label>
      <select id="decision" name="decision" required>
        <option value="changes_requested">Потрібні зміни</option>
        <option value="recommend_approval">Рекомендувати схвалення</option>
        <option value="rejected">Відхилити</option>
      </select>
      <label htmlFor="evidence">Обґрунтування та посилання на докази</label>
      <textarea id="evidence" name="evidence" minLength={10} maxLength={2000} required />
      <p className="muted">
        Рекомендація не є юридичним підтвердженням. Автор не може рецензувати власну ревізію.
      </p>
      {state.error && (
        <p role="alert" className="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="notice">
          {state.success}
        </p>
      )}
      <button className="button" disabled={pending}>
        {pending ? "Надсилання…" : "Надіслати рекомендацію"}
      </button>
    </form>
  );
}
