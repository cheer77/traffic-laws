import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions";
import { AuthForm } from "@/components/AuthForm";
import { currentProfile } from "@/lib/api";
export default async function LoginPage() {
  if (await currentProfile()) redirect("/school");
  return (
    <section className="auth-card">
      <p className="eyebrow">
        <span /> З поверненням
      </p>
      <h2>Увійдіть до школи</h2>
      <p>Продовжуйте з того місця, де зупинилися.</p>
      <AuthForm action={loginAction} mode="login" />
      <p className="auth-switch">
        Ще немає акаунта? <Link href="/register">Зареєструватися</Link>
      </p>
    </section>
  );
}
