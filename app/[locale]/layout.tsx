import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { DEFAULT_LOCALE, getLocaleFromRoute } from "@/lib/locale";
import { ROOT_METADATA } from "@/lib/site-metadata";
import "../globals.css";

export const metadata = ROOT_METADATA;

export default async function LocaleLayout({
  params,
  children
}: Readonly<{
  params: Promise<{
    locale?: string;
  }>;
  children: ReactNode;
}>) {
  const { locale: routeLocale } = await params;
  const initialLocale = getLocaleFromRoute(routeLocale) || DEFAULT_LOCALE;

  return (
    <html lang={initialLocale}>
      <body>
        {children}
        <SiteFooter locale={initialLocale} />
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
