import type { ReactNode } from "react";
import { requireStudent } from "@/lib/api";

export default async function SchoolLayout({ children }: { children: ReactNode }) {
  await requireStudent();
  return children;
}
