import { UA_PDR_REFERENCES } from "@traffic-laws/country-rules/ua-pdr-references";
import { ScenarioEditor } from "@/components/ScenarioEditor";
import { requireStaff } from "@/lib/api";
export default async function NewScenario() {
  await requireStaff();
  return (
    <>
      <h1>Нова чернетка</h1>
      <p className="notice">
        Створіть текстовий або 3D-білет через звичайні поля. Публікація буде окремою дією після
        перевірки конкретної ревізії.
      </p>
      <section className="card">
        <ScenarioEditor rules={UA_PDR_REFERENCES} />
      </section>
    </>
  );
}
