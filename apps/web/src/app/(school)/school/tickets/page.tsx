import { apiFetch } from "@/lib/api";
import type { Page, ScenarioListItem } from "@/lib/contracts";
import Link from "next/link";
export default async function TicketsPage() {
  const scenarios = await apiFetch<Page<ScenarioListItem>>("/scenarios?limit=50");
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">
          <span /> Каталог
        </p>
        <h1>Навчальні завдання</h1>
        <p>Лише матеріали, які власник явно опублікував для навчання.</p>
      </div>
      {scenarios.items.length ? (
        <div className="ticket-grid">
          {scenarios.items.map((item) => (
            <Link
              className="ticket-card"
              key={`${item.id}-${item.revision}`}
              href={`/school/tickets/${encodeURIComponent(item.id)}/${item.revision}`}
            >
              <span className={`ticket-type ticket-${item.presentation ?? "text"}`}>
                {item.presentation === "3d" ? "3D-ситуація" : "Текст"}
              </span>
              <small>{item.category}</small>
              <h3>{item.question ?? "Навчальна дорожня ситуація"}</h3>
              <span className="ticket-link">Розпочати →</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span>◇</span>
          <h2>Каталог готується</h2>
          <p>
            Немає матеріалів, що пройшли явну публікацію власником. Це чесний порожній стан —
            чернетки приховані.
          </p>
        </div>
      )}
    </>
  );
}
