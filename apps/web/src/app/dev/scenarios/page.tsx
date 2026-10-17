import { notFound } from "next/navigation";
import ScenarioCheck from "./ScenarioCheck";

export default function ScenarioPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <h1>Технічна демонстрація сценаріїв</h1>
      <ScenarioCheck />
    </main>
  );
}
