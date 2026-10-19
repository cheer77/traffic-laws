import Link from "next/link";
import Trainer from "@/features/trainer/Trainer";
import { requireStudent } from "@/lib/api";
import { isUiPreview } from "@/lib/ui-preview";
import { logoutAction } from "@/app/actions";
import "@/features/trainer/trainer.css";

export default async function SchoolPage() {
  // Pages and layouts can render concurrently: authorize here before returning any content too.
  await requireStudent();
  if (await isUiPreview()) return <Trainer />;
  return (
    <main className="container">
      <h1>Онлайн-школа</h1>
      <p>
        Навчальні сценарії тренажера ще проходять перевірку. Вони доступні лише в локальному режимі
        розробки та не входять до опублікованого набору.
      </p>
      <Link href="/">На головну</Link>
      <form action={logoutAction}>
        <button className="ui-button ui-button-default">Вийти</button>
      </form>
    </main>
  );
}
