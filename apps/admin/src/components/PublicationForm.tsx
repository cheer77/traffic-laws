"use client";
import { useActionState } from "react";
import { publicationAction, type FormState } from "@/app/actions";
export function PublicationForm({
  id,
  revision,
  published,
}: {
  id: string;
  revision: number;
  published: boolean;
}) {
  const mode = published ? "unpublish" : "publish";
  const action = publicationAction.bind(null, mode, id, revision);
  const [state, submit, pending] = useActionState<FormState, FormData>(action, { error: null });
  return (
    <form action={submit} className={published ? "danger-zone" : "publication-form"}>
      <label htmlFor="publication-evidence">Обґрунтування рішення власника</label>
      <textarea
        id="publication-evidence"
        name="evidence"
        minLength={10}
        maxLength={500}
        required
        placeholder={
          published
            ? "Чому матеріал потрібно прибрати з навчального каталогу"
            : "Що саме перевірено: запитання, відповідь, пояснення, джерело та візуальна сцена"
        }
      />
      <label htmlFor="publication-confirmation">Для підтвердження введіть «{mode}»</label>
      <input
        id="publication-confirmation"
        name="confirmation"
        required
        pattern={mode}
        autoComplete="off"
      />
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
        {pending ? "Виконуємо…" : published ? "Зняти з публікації" : "Опублікувати для учнів"}
      </button>
    </form>
  );
}
