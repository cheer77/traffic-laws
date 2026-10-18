import { requireStaff } from "@/lib/api";
export default async function Account() {
  const user = await requireStaff();
  return (
    <>
      <h1>Мій профіль</h1>
      <div className="card">
        <p>
          <strong>Електронна пошта:</strong> {user.email}
        </p>
        <p>
          <strong>Роль:</strong> {user.role === "admin" ? "адміністратор" : "рецензент"}
        </p>
        <p>
          <strong>Стан:</strong> {user.status === "active" ? "активний" : "вимкнений"}
        </p>
        <p>
          <strong>Створено:</strong> {new Date(user.createdAt).toLocaleDateString("uk-UA")}
        </p>
      </div>
    </>
  );
}
