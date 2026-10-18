import type { ReactNode } from "react";
import "./globals.css";
export const metadata = { title: "ПДР України — Адміністрування" };
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
