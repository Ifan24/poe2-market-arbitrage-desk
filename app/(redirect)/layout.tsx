import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";
import { DEFAULT_LOCALE } from "@/lib/locale";
import { ROOT_METADATA } from "@/lib/site-metadata";
import "../globals.css";

export const metadata = ROOT_METADATA;

export default function RedirectLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang={DEFAULT_LOCALE}>
      <body>
        {children}
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
