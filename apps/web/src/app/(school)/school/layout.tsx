import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions";
import { requireStudent } from "@/lib/api";
export default async function SchoolLayout({ children }: { children: ReactNode }) {
  const profile = await requireStudent();
  return (
    <div className="school-shell">
      <aside className="school-sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">TL</span>
          <span>Traffic Laws</span>
        </Link>
        <nav aria-label="Навігація школи">
          <Link href="/school">
            <span>⌂</span> Огляд
          </Link>
          <Link href="/school/tickets">
            <span>◇</span> Завдання
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="user-chip">
            <span>{profile.email.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{profile.email.split("@")[0]}</strong>
              <small>{profile.email}</small>
            </div>
          </div>
          <form action={logoutAction}>
            <button className="logout-button">Вийти</button>
          </form>
        </div>
      </aside>
      <div className="school-main">
        <header className="school-topbar">
          <div>
            <span className="mobile-brand">Traffic Laws</span>
          </div>
          <Link className="button button-small" href="/school/tickets">
            Продовжити навчання
          </Link>
        </header>
        <main className="school-content">{children}</main>
      </div>
    </div>
  );
}
