import { LoginForm } from "@/components/ActionForm";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string; logout?: string }>;
}) {
  const { expired, logout } = await searchParams;
  return (
    <main className="card login">
      <h1>Адміністрування ПДР</h1>
      <p className="muted">Увійдіть з обліковим записом редактора або адміністратора.</p>
      {expired === "1" && (
        <p role="alert" className="notice">
          Сеанс завершився. Увійдіть повторно.
        </p>
      )}
      {logout === "partial" && (
        <p role="alert" className="alert">
          Локальний сеанс завершено, але API не підтвердив відкликання токена. Спробуйте повторно
          після відновлення з’єднання.
        </p>
      )}
      <LoginForm />
    </main>
  );
}
