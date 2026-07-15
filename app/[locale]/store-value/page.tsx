import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MarketAppreciationPage } from "@/components/market-appreciation-page";
import { getLocaleFromRoute, SUPPORTED_LOCALE_ROUTES, type LocaleRoute } from "@/lib/locale";
import { toMarketDataShell, toPublicMarketData } from "@/lib/market-data";
import { readMarketDataBootstrap } from "@/lib/market-data-source";
import { UI_TEXT } from "@/lib/market-locale";
import { getLanguageAlternates, getOpenGraphAlternateLocales, getOpenGraphLocale, getSiteUrl } from "@/lib/site-metadata";

type LocaleStoreValuePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export function generateStaticParams(): Array<{ locale: LocaleRoute }> {
  return SUPPORTED_LOCALE_ROUTES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleStoreValuePageProps): Promise<Metadata> {
  const { locale: routeLocale } = await params;
  const locale = getLocaleFromRoute(routeLocale);

  if (!locale) {
    return {};
  }

  const path = `/${routeLocale}/store-value`;
  const title = UI_TEXT[locale].storeValue;
  const description = UI_TEXT[locale].appreciationSignalsDescription;

  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: getLanguageAlternates((localeRoute) => `${localeRoute.path}/store-value`)
    },
    openGraph: {
      url: getSiteUrl(path),
      title,
      description,
      locale: getOpenGraphLocale(locale),
      alternateLocale: getOpenGraphAlternateLocales(locale)
    },
    twitter: {
      title,
      description
    }
  };
}

export default async function LocalizedStoreValue({ params }: LocaleStoreValuePageProps) {
  const { locale: routeLocale } = await params;
  const locale = getLocaleFromRoute(routeLocale);

  if (!locale) {
    notFound();
  }

  const bootstrap = await readMarketDataBootstrap();
  const baselineData = toPublicMarketData(bootstrap.initialData);
  const marketData = bootstrap.source.requireRemote ? toMarketDataShell(baselineData) : baselineData;

  return <MarketAppreciationPage initialData={marketData} initialLocale={locale} dataSource={bootstrap.source} />;
}
