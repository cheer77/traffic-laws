"use client";
export default function StaffError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="card" role="alert">
      <h1>Не вдалося завантажити дані</h1>
      <p>Перевірте з’єднання з API та повторіть спробу.</p>
      <button className="button" onClick={reset}>
        Повторити
      </button>
    </section>
  );
}
