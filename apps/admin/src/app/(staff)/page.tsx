import Link from "next/link";
import { apiFetch, requireStaff } from "@/lib/api";
import type { Page, RevisionMetadata } from "@/lib/contracts";
export default async function Overview() {
  await requireStaff();
  const result = await apiFetch<Page<RevisionMetadata>>("/internal/scenarios?limit=8");
  return (
    <>
      <h1>Огляд</h1>
      <p className="muted">Останні збережені ревізії з захищеного API.</p>
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
