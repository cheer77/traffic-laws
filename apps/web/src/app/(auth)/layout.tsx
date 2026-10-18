import Link from "next/link";
import type { ReactNode } from "react";
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-shell">
      <Link className="brand" href="/">
        <span className="brand-mark">TL</span>
        <span>Traffic Laws</span>
      </Link>
      <div className="auth-stage">
        <section className="auth-aside">
          <p className="eyebrow eyebrow-light">
            <span /> ПДР без зубріння
          </p>
          <h1>
            Навчайтесь бачити
            <br />
            ситуацію цілісно.
          </h1>
          <p>
            Запитання, пояснення та інтерактивні сцени — в одному спокійному навчальному просторі.
          </p>
          <div className="auth-road">
            <span className="auth-car">↑</span>
          </div>
        </section>
        {children}
      </div>
    </main>
  );
}
