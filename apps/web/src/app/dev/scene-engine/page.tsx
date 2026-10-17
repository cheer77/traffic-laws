import { notFound } from "next/navigation";
import SceneCheck from "./SceneCheck";
export default function SceneCheckPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <main>
      <h1>Незалежна перевірка Scene Engine</h1>
      <SceneCheck />
    </main>
  );
}
