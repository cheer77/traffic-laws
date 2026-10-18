import Link from "next/link";
import type { ReactNode } from "react";
import { requireStaff } from "@/lib/api";
import { logoutAction } from "@/app/actions";
export default async function StaffLayout({ children }: { children: ReactNode }) {
  const profile = await requireStaff();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          ПДР України <small>• Адмін</small>
        </div>
        <nav aria-label="Основна навігація">
          <Link href="/">Огляд</Link>
          <Link href="/scenarios">Сценарії</Link>
          <Link href="/imports">Імпорт питань</Link>
          <Link href="/account">Мій профіль</Link>
        </nav>
        <p style={{ marginTop: 40, opacity: 0.8 }}>
          Роль: {profile.role === "admin" ? "адміністратор" : "рецензент"}
        </p>
      </aside>
      <div className="main">
        <header className="topbar">
          <span>Керування навчальними матеріалами</span>
          <form action={logoutAction}>
            <button className="button secondary">Вийти</button>
          </form>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
