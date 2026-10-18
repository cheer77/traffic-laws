import { apiFetch, requireStaff } from "@/lib/api";
import type { ImportOverview } from "@/lib/contracts";
import { ImportAction } from "@/components/ImportAction";

const RUN_STATUS = { completed: "Завершено", blocked: "Заблоковано", failed: "Помилка" };

export default async function ImportsPage() {
  const profile = await requireStaff();
  const overview = await apiFetch<ImportOverview>("/internal/imports");
  const latest = overview.runs[0];
  return (
    <>
      <div className="actions" style={{ justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <h1>Імпорт офіційних питань</h1>
          <p className="muted">Перевірка джерела, прав використання та журнал запусків.</p>
        </div>
        <ImportAction disabled={profile.role !== "admin"} />
      </div>

      <section className="card source-card">
        <div>
          <span className="badge">Офіційне джерело</span>
          <h2>{overview.source.name}</h2>
          <p>{overview.source.edition}</p>
          <p className="muted">Оновлено: {overview.source.sourceUpdatedAt}</p>
        </div>
        <div className="source-links">
          <a href={overview.source.pageUrl} target="_blank" rel="noreferrer">
            Сторінка ГСЦ МВС ↗
          </a>
          <a href={overview.source.questionsUrl} target="_blank" rel="noreferrer">
            Питання ({overview.source.questionsPages} стор.) ↗
          </a>
          <a href={overview.source.answersUrl} target="_blank" rel="noreferrer">
            Ключ відповідей ({overview.source.answersPages} стор.) ↗
          </a>
        </div>
      </section>

      <section className="card legal-warning">
        <h2>Автопублікацію призупинено</h2>
        <p>{overview.source.note}</p>
        <p>
          Тексти та правильні відповіді не створюються з ненадійного OCR. Сервіс Infotech не
          використовується для імпорту, оскільки його угода забороняє видобування даних.
        </p>
      </section>

      <div className="metric-grid">
        {[
          ["Знайдено", latest?.found ?? 0],
          ["Імпортовано", latest?.imported ?? 0],
          ["Оновлено", latest?.updated ?? 0],
          ["Відхилено", latest?.rejected ?? 0],
          ["Опубліковано", latest?.published ?? 0],
          ["Зображення", latest?.withImages ?? 0],
          ["Кандидати 3D", latest?.threeDCandidates ?? 0],
        ].map(([label, value]) => (
          <article className="card metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <section className="card table-wrap">
        <h2>Журнал імпорту</h2>
        {overview.runs.length ? (
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Редакція</th>
                <th>Статус</th>
                <th>Результат</th>
              </tr>
            </thead>
            <tbody>
              {overview.runs.map((run) => (
                <tr key={run.id}>
                  <td>{new Date(run.createdAt).toLocaleString("uk-UA")}</td>
                  <td>{run.edition}</td>
                  <td>
                    <span className="badge">{RUN_STATUS[run.status]}</span>
                  </td>
                  <td>{run.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">Перевірку ще не запускали.</p>
        )}
      </section>
    </>
  );
}
