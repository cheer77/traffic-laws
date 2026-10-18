import { ScenarioForm } from "@/components/ActionForm";
import { requireStaff } from "@/lib/api";
const template = {
  schemaVersion: 1,
  revision: 1,
  id: "new-ua-scenario",
  country: "UA",
  language: "uk",
  category: "Навчальний сценарій",
  question: "Введіть запитання",
  answers: [
    { id: "a", text: "Варіант А" },
    { id: "b", text: "Варіант Б" },
  ],
  correctAnswerId: "a",
  explanation: "Введіть пояснення",
  ruleReferences: [],
  sceneReference: null,
  contentStatus: { state: "draft" },
};
export default async function NewScenario() {
  await requireStaff();
  return (
    <>
      <h1>Нова чернетка</h1>
      <p className="notice">
        Шаблон є технічним початком. Заповніть зміст і нормативні посилання перед рецензуванням.
      </p>
      <section className="card">
        <ScenarioForm payload={JSON.stringify(template, null, 2)} expectedRevision={0} />
      </section>
    </>
  );
}
