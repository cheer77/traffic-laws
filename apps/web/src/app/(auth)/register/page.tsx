import Link from "next/link";
import { redirect } from "next/navigation";
import { registerAction } from "@/app/actions";
import { AuthForm } from "@/components/AuthForm";
import { currentProfile } from "@/lib/api";
export default async function RegisterPage() {
  if (await currentProfile()) redirect("/school");
  return (
    <section className="auth-card">
      <p className="eyebrow">
        <span /> Безкоштовний MVP
      </p>
      <h2>Створіть акаунт</h2>
      <p>Отримайте доступ до опублікованих навчальних матеріалів.</p>
      <AuthForm action={registerAction} mode="register" />
      <p className="auth-switch">
        Уже зареєстровані? <Link href="/login">Увійти</Link>
      </p>
    </section>
  );
}
