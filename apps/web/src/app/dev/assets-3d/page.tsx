import { notFound } from "next/navigation";
import AssetCheck from "./AssetCheck";
export default function AssetCheckPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <main>
      <h1>Перевірка 3D-бібліотеки</h1>
      <AssetCheck />
    </main>
  );
}
