import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "РУХ / Scene Studio", description: "Студія перегляду транспорту та міського 3D-середовища" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="uk"><body>{children}</body></html>; }
