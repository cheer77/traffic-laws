import type { Metadata } from "next";
import "./globals.css";
import { UiPreviewBadge } from "@/components/UiPreviewBadge";
export const metadata: Metadata = { title: "РУХ / Scene Studio", description: "Студія перегляду транспорту та міського 3D-середовища" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="uk"><body><UiPreviewBadge />{children}</body></html>; }
