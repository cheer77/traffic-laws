import Link from "next/link";
import { apiFetch, requireStaff } from "@/lib/api";
import type { Page, RevisionMetadata } from "@/lib/contracts";
const STATUS: Record<string, string> = {
  draft: "Чернетка",
  in_review: "На перевірці",
  verified: "Перевірено",
  published: "Опубліковано",
};
export default async function Scenarios({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;
  const page =
    typeof params.page === "string" && /^\d+$/.test(params.page)
      ? Math.min(200, Math.max(1, Number(params.page)))
      : 1;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 80);
  const status = params.status === "draft" || params.status === "in_review" ? params.status : "";
  const filters = new URLSearchParams({ page: String(page), limit: "50" });
  if (q) filters.set("q", q);
  if (status) filters.set("status", status);
  const result = await apiFetch<Page<RevisionMetadata>>(
    `/internal/scenarios?${filters.toString()}`,
  );
  const items = result.items;
  const pageLink = (nextPage: number) => {
    const search = new URLSearchParams(filters);
    search.set("page", String(nextPage));
    search.delete("limit");
    return `/scenarios?${search.toString()}`;
  };
  return (
    <>
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Сценарії</h1>
          <p className="muted">Захищений каталог ревізій</p>
        </div>
        <Link className="button" href="/scenarios/new">
          Створити чернетку
        </Link>
      </div>
      <form className="card" method="get">
        <div className="grid">
          <div>
            <label htmlFor="q">Пошук за ID сценарію</label>
            <input id="q" name="q" maxLength={80} defaultValue={q} />
          </div>
          <div>
            <label htmlFor="status">Статус</label>
            <select id="status" name="status" defaultValue={status}>
              <option value="">Усі</option>
              <option value="draft">Чернетка</option>
              <option value="in_review">На перевірці</option>
            </select>
          </div>
        </div>
        <p>
          <button className="button secondary">Застосувати</button>
        </p>
      </form>
      <section className="card table-wrap">
        {items.length ? (
          <table>
            <thead>
              <tr>
                <th>Сценарій</th>
                <th>Ревізія</th>
                <th>Статус</th>
                <th>Створено</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={`${item.id}-${item.revision}`}>
                  <td>
                    <Link href={`/scenarios/${encodeURIComponent(item.id)}/${item.revision}`}>
                      {item.question}
                    </Link>
                    <br />
                    <small className="muted">
                      {item.id} · {item.category}
                    </small>
                  </td>
                  <td>{item.revision}</td>
                  <td>
                    <span className="badge">
                      {STATUS[item.contentStatus] ?? item.contentStatus}
                    </span>
                  </td>
                  <td>{new Date(item.createdAt).toLocaleDateString("uk-UA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>На цій сторінці сценаріїв не знайдено.</p>
        )}
      </section>
      <div className="actions">
        {page > 1 && (
          <Link className="button secondary" href={pageLink(page - 1)}>
            Назад
          </Link>
        )}
        {result.nextPage && (
          <Link className="button secondary" href={pageLink(result.nextPage)}>
            Далі
          </Link>
        )}
      </div>
    </>
  );
}
