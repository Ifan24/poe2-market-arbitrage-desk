import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MarketRouteDetailPage } from "@/components/market-route-detail-page";
import { getLocaleFromRoute, SUPPORTED_LOCALE_ROUTES, type LocaleRoute } from "@/lib/locale";
import { toMarketDataShell, toPublicMarketData } from "@/lib/market-data";
import { readMarketDataBootstrap } from "@/lib/market-data-source";
import { UI_TEXT } from "@/lib/market-locale";
import { decodeTrendRouteKey } from "@/lib/trend-route-links";
import { getLanguageAlternates, getOpenGraphAlternateLocales, getOpenGraphLocale, getSiteUrl } from "@/lib/site-metadata";

type LocaleRouteDetailPageProps = {
  params: Promise<{
    locale: string;
    routeKey: string;
  }>;
};

export function generateStaticParams(): Array<{ locale: LocaleRoute }> {
  return SUPPORTED_LOCALE_ROUTES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleRouteDetailPageProps): Promise<Metadata> {
  const { locale: routeLocale, routeKey } = await params;
  const locale = getLocaleFromRoute(routeLocale);

  if (!locale) {
    return {};
  }

  const decodedRouteKey = decodeTrendRouteKey(routeKey);
  const path = `/${routeLocale}/routes/${routeKey}`;
  const title = `${UI_TEXT[locale].routeDetailPage} · ${decodedRouteKey}`;
  const description = UI_TEXT[locale].trendConfidenceDescription;

  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: getLanguageAlternates((localeRoute) => `${localeRoute.path}/routes/${routeKey}`)
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

export default async function LocalizedRouteDetail({ params }: LocaleRouteDetailPageProps) {
  const { locale: routeLocale, routeKey } = await params;
  const locale = getLocaleFromRoute(routeLocale);

  if (!locale) {
    notFound();
  }

  const decodedRouteKey = decodeTrendRouteKey(routeKey);
  if (!decodedRouteKey) {
    notFound();
  }

  const bootstrap = await readMarketDataBootstrap();
  const baselineData = toPublicMarketData(bootstrap.initialData);
  const marketData = bootstrap.source.requireRemote ? toMarketDataShell(baselineData) : baselineData;

  return (
    <MarketRouteDetailPage
      initialData={marketData}
      initialLocale={locale}
      dataSource={bootstrap.source}
      routeKey={decodedRouteKey}
    />
  );
}
