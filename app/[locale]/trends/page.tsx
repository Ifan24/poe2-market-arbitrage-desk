import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MarketTrendsPage } from "@/components/market-trends-page";
import { getLocaleFromRoute, SUPPORTED_LOCALE_ROUTES, type LocaleRoute } from "@/lib/locale";
import { toMarketDataShell, toPublicMarketData } from "@/lib/market-data";
import { readMarketDataBootstrap } from "@/lib/market-data-source";
import { getLocalizedPageMetadata } from "@/lib/site-metadata";

type LocaleTrendsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export function generateStaticParams(): Array<{ locale: LocaleRoute }> {
  return SUPPORTED_LOCALE_ROUTES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleTrendsPageProps): Promise<Metadata> {
  const { locale: routeLocale } = await params;
  const locale = getLocaleFromRoute(routeLocale);

  if (!locale) {
    return {};
  }

  const localized = getLocalizedPageMetadata(locale, "trends");

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

export default async function LocalizedTrends({ params }: LocaleTrendsPageProps) {
  const { locale: routeLocale } = await params;
  const locale = getLocaleFromRoute(routeLocale);

  if (!locale) {
    notFound();
  }

  const bootstrap = await readMarketDataBootstrap();
  const baselineData = toPublicMarketData(bootstrap.initialData);
  const marketData = bootstrap.source.requireRemote ? toMarketDataShell(baselineData) : baselineData;

  return <MarketTrendsPage initialData={marketData} initialLocale={locale} dataSource={bootstrap.source} />;
}
