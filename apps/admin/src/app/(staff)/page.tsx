import Link from "next/link";
import { apiFetch, requireStaff } from "@/lib/api";
import type { Page, RevisionMetadata } from "@/lib/contracts";
import { UI_PREVIEW_ANALYTICS, UI_PREVIEW_EXAMS, UI_PREVIEW_USERS } from "@traffic-laws/ui-preview";
import { isUiPreview } from "@/lib/ui-preview";
export default async function Overview() {
  const [, result, preview] = await Promise.all([
    requireStaff(),
    apiFetch<Page<RevisionMetadata>>("/internal/scenarios?limit=8"),
    isUiPreview(),
  ]);
  return (
    <>
      <h1>Огляд</h1>
      <p className="muted">Останні збережені ревізії з захищеного API.</p>
      {preview && (
        <p className="preview-notice">
          Тестові дані UI Preview. Аналітика, користувачі та іспити не пов’язані з реальною базою.
        </p>
      )}
      <div className="grid">
        <section className="card">
          <h2>Останні ревізії</h2>
          <p>{result.items.length} на цій сторінці</p>
        </section>
        <section className="card">
          <h2>Публікація</h2>
          <p>Доступна адміністратору для точних незмінних ревізій.</p>
        </section>
        <section className="card">
          <h2>Офіційний банк</h2>
          <p>
            <Link href="/imports">Перевірити джерело та журнал імпорту →</Link>
          </p>
        </section>
      </div>
      {preview && (
        <div className="grid">
          <section className="card">
            <h2>Тестова аналітика</h2>
            <p>
              <strong>{UI_PREVIEW_ANALYTICS.activeStudents}</strong> активних учнів ·{" "}
              {UI_PREVIEW_ANALYTICS.averageAccuracy}% точності
            </p>
          </section>
          <section className="card">
            <h2>Тестові користувачі</h2>
            <p>{UI_PREVIEW_USERS.length} демонстраційні профілі</p>
          </section>
          <section className="card">
            <h2>Тестові іспити</h2>
            <p>{UI_PREVIEW_EXAMS.length} демонстраційні набори</p>
          </section>
        </div>
      )}
      <section className="card">
        <h2>Нещодавні зміни</h2>
        {result.items.length ? (
          <ul>
            {result.items.map((item) => (
              <li key={`${item.id}-${item.revision}`}>
                <Link href={`/scenarios/${encodeURIComponent(item.id)}/${item.revision}`}>
                  {item.question}
                </Link>{" "}
                · ревізія {item.revision}
              </li>
            ))}
          </ul>
        ) : (
          <p>Ревізій поки немає.</p>
        )}
        <Link className="button" href="/scenarios">
          Усі сценарії
        </Link>
      </section>
    </>
  );
}
