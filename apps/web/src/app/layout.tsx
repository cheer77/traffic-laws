import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { PreviewModeBanner } from "@/components/PreviewModeBanner";

export const metadata: Metadata = {
  title: "ПДР України",
  description: "Платформа для інтерактивного вивчення правил дорожнього руху України",
};

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
