"use client";
export default function SchoolError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <span>!</span>
      <h2>Не вдалося отримати дані</h2>
      <p>Перевірте, чи запущений API, і повторіть спробу.</p>
      <button className="button" onClick={reset}>
        Спробувати ще раз
      </button>
    </div>
  );
}
