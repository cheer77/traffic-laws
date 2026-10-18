export default function Forbidden() {
  return (
    <main className="card login">
      <h1>Доступ заборонено</h1>
      <p>Цей застосунок доступний лише рецензентам та адміністраторам.</p>
      <a href="/login">Повернутися до входу</a>
    </main>
  );
}
