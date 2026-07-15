import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MarketDashboard } from "@/components/market-dashboard";
import { MarketSeoSummary } from "@/components/market-seo-summary";
import { getLocaleFromRoute, SUPPORTED_LOCALE_ROUTES, type LocaleRoute } from "@/lib/locale";
import { readMarketDataBootstrap } from "@/lib/market-data-source";
import { toMarketDataShell, toPublicMarketData } from "@/lib/market-data";
import { buildMarketSeoSummary } from "@/lib/market-seo-summary";
import { getLocalizedPageMetadata } from "@/lib/site-metadata";

type LocalePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export function generateStaticParams(): Array<{ locale: LocaleRoute }> {
  return SUPPORTED_LOCALE_ROUTES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale: routeLocale } = await params;
  const locale = getLocaleFromRoute(routeLocale);

  if (!locale) {
    return {};
  }

  const localized = getLocalizedPageMetadata(locale, "home");

  return {
    title: localized.title,
    description: localized.description,
    alternates: {
      canonical: localized.path,
      languages: localized.alternates
    },
    openGraph: {
      url: localized.openGraphUrl,
      title: localized.title,
      description: localized.description,
      locale: localized.openGraphLocale,
      alternateLocale: localized.openGraphAlternateLocales
    },
    twitter: {
      title: localized.title,
      description: localized.description
    }
  };
}

export default async function LocalizedHome({ params }: LocalePageProps) {
  const { locale: routeLocale } = await params;
  const locale = getLocaleFromRoute(routeLocale);

  if (!locale) {
    notFound();
  }

  const bootstrap = await readMarketDataBootstrap();
  const baselineData = toPublicMarketData(bootstrap.initialData);
  const marketData = bootstrap.source.requireRemote ? toMarketDataShell(baselineData) : baselineData;
  const marketSummary = buildMarketSeoSummary(baselineData);

  return (
    <>
      <MarketDashboard initialData={marketData} initialLocale={locale} dataSource={bootstrap.source} />
      <MarketSeoSummary summary={marketSummary} locale={locale} />
    </>
  );
}
