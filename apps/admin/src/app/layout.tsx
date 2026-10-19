import type { ReactNode } from "react";
import "./globals.css";
import { PreviewModeBanner } from "@/components/PreviewModeBanner";
export const metadata = { title: "ПДР України — Адміністрування" };
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="uk">
      <body>
        <PreviewModeBanner />
        {children}
      </body>
    </html>
  );
}
