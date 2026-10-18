import Link from "next/link";
import { apiFetch, requireStudent } from "@/lib/api";
import type { Attempt, Page, ProgressSummary, ScenarioListItem } from "@/lib/contracts";
export default async function SchoolPage() {
  const profile = await requireStudent();
  const [progress, history, scenarios] = await Promise.all([
    apiFetch<ProgressSummary>("/progress"),
    apiFetch<Page<Attempt>>("/progress/attempts?limit=5"),
    apiFetch<Page<ScenarioListItem>>("/scenarios?limit=6"),
  ]);
  const percent = progress.attempts ? Math.round((progress.correct / progress.attempts) * 100) : 0;
  return (
    <>
      <section className="dashboard-welcome">
        <div>
          <p className="eyebrow">
            <span /> Особистий кабінет
          </p>
          <h1>Вітаємо, {profile.email.split("@")[0]}</h1>
          <p>Оберіть наступне завдання або перегляньте свій прогрес.</p>
        </div>
        <div
          className="progress-ring"
          style={{ "--progress": `${percent * 3.6}deg` } as React.CSSProperties}
        >
          <span>
            {percent}%<small>точність</small>
          </span>
        </div>
      </section>
      <div className="stat-grid">
        <article>
          <span>Усього спроб</span>
          <strong>{progress.attempts}</strong>
        </article>
        <article>
          <span>Правильних відповідей</span>
          <strong>{progress.correct}</strong>
        </article>
        <article>
          <span>Опрацьовано завдань</span>
          <strong>{progress.completedRevisions}</strong>
        </article>
      </div>
      <section className="dashboard-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">
              <span /> Далі
            </p>
            <h2>Доступні завдання</h2>
          </div>
          <Link href="/school/tickets">Переглянути всі →</Link>
        </div>
        {scenarios.items.length ? (
          <div className="ticket-grid">
            {scenarios.items.slice(0, 3).map((item) => (
              <TicketCard key={`${item.id}-${item.revision}`} item={item} />
            ))}
          </div>
        ) : (
          <EmptyTickets />
        )}
      </section>
      <section className="dashboard-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">
              <span /> Активність
            </p>
            <h2>Останні спроби</h2>
          </div>
        </div>
        {history.items.length ? (
          <div className="history-list">
            {history.items.map((item) => (
              <div key={item.id}>
                <span className={item.correct ? "history-ok" : "history-no"}>
                  {item.correct ? "✓" : "×"}
                </span>
                <div>
                  <strong>{item.scenarioId}</strong>
                  <small>{new Date(item.completedAt).toLocaleString("uk-UA")}</small>
                </div>
                <b>{item.correct ? "Правильно" : "Помилка"}</b>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-line">Історія з’явиться після першої відповіді.</p>
        )}
      </section>
    </>
  );
}
function TicketCard({ item }: { item: ScenarioListItem }) {
  const type = item.presentation ?? "text";
  return (
    <Link
      className="ticket-card"
      href={`/school/tickets/${encodeURIComponent(item.id)}/${item.revision}`}
    >
      <span className={`ticket-type ticket-${type}`}>{type === "3d" ? "3D" : "Текст"}</span>
      <small>{item.category}</small>
      <h3>{item.question ?? "Навчальна дорожня ситуація"}</h3>
      <span className="ticket-link">Відкрити завдання →</span>
    </Link>
  );
}
function EmptyTickets() {
  return (
    <div className="empty-state">
      <span>◇</span>
      <h3>Опублікованих завдань поки немає</h3>
      <p>Власник готує перший перевірений набір. Чернетки не показуються учням автоматично.</p>
    </div>
  );
}
