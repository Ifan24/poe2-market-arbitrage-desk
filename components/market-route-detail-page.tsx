"use client";

import {
  ArrowDownUpIcon,
  ArrowLeftIcon,
  ListChecksIcon,
  TrendingUpIcon
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { CategoryBadge, CurrencyName, ItemIcon } from "@/components/market-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getIntegerRoiRows } from "@/lib/market-arbitrage";
import { getLocaleRoute, type Locale } from "@/lib/locale";
import type { MarketData } from "@/lib/market-data";
import type { MarketDataManifest, MarketDataSourceConfig } from "@/lib/market-data-source";
import {
  UI_TEXT,
  formatDate,
  formatItemName,
  formatMessage,
  formatNumber,
  formatPercent,
  type UiText
} from "@/lib/market-locale";
import type { MarketTrendIndex, ProfitPersistenceWindow, TrendSeriesPoint } from "@/lib/market-trend-index";
import { getTrendRouteRow, getTrendSeriesDelta, type TrendRouteRow } from "@/lib/trends-model";

type MarketRouteDetailPageProps = {
  initialData: MarketData;
  initialLocale: Locale;
  dataSource: MarketDataSourceConfig;
  routeKey: string;
};

const roiChartConfig = {
  roi: {
    label: "ROI",
    color: "var(--primary)"
  }
} satisfies ChartConfig;

function resolveRemoteUrl(baseUrl: string, pathOrUrl: string) {
  return new URL(pathOrUrl, `${baseUrl.replace(/\/+$/, "")}/`).toString();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function LocalSnapshotTime({ value, locale, t }: { value: string | undefined; locale: Locale; t: UiText }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    setLabel(formatDate(value, locale, t));
  }, [locale, t, value]);

  return (
    <time dateTime={value} suppressHydrationWarning>
      {label || "..."}
    </time>
  );
}

function formatPersistenceValue(value: ProfitPersistenceWindow | null, locale: Locale) {
  if (!value || value.percent === null) {
    return "--";
  }

  return `${formatPercent(value.percent, locale)} (${formatNumber(value.profitableSamples, 0, locale)}/${formatNumber(value.totalSamples, 0, locale)})`;
}

function getSeriesRange(points: TrendSeriesPoint[]) {
  if (!points.length) {
    return null;
  }

  const values = points.map((point) => point.roi);
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

function getDetailDecision(row: TrendRouteRow, delta: number | null, t: UiText) {
  const persistence7d = row.persistence7d?.percent ?? null;
  const totalSamples = Math.max(row.persistence24h?.totalSamples || 0, row.persistence7d?.totalSamples || 0);
  const hasStableProfit = persistence7d !== null && persistence7d >= 80 && totalSamples >= 12;
  const hasImprovingTrend = delta !== null && delta >= 20;
  const hasGoodFlow = row.result.volume >= 50000 && row.result.stock >= 200;

  if (hasStableProfit && hasGoodFlow) {
    return {
      title: t.worthChecking,
      description: t.worthCheckingHint,
      variant: "default" as const
    };
  }

  if (hasStableProfit || hasImprovingTrend || hasGoodFlow) {
    return {
      title: t.verifyFirst,
      description: t.verifyFirstHint,
      variant: "secondary" as const
    };
  }

  return {
    title: t.thinSignal,
    description: t.thinSignalHint,
    variant: "outline" as const
  };
}

function MetricBlock({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "primary" }) {
  return (
    <div className="rounded-md border bg-background/45 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 font-medium ${tone === "primary" ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}

function RouteTrendChart({ points, locale, t }: { points: TrendSeriesPoint[]; locale: Locale; t: UiText }) {
  const chartData = points.map((point, index) => ({
    sample: index + 1,
    roi: point.roi
  }));

  if (chartData.length < 2) {
    return (
      <div className="rounded-md border bg-background/45 px-3 py-12 text-center text-sm text-muted-foreground">
        {t.lowSampleTrend}
      </div>
    );
  }

  return (
    <ChartContainer config={roiChartConfig} className="aspect-auto h-72 w-full">
      <AreaChart accessibilityLayer data={chartData} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="sample" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={44} tickFormatter={(value) => `${value}%`} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value) => (
                <span className="font-mono font-medium tabular-nums">{formatPercent(Number(value), locale)}</span>
              )}
            />
          }
        />
        <Area
          dataKey="roi"
          type="monotone"
          stroke="var(--color-roi)"
          strokeWidth={2}
          fill="var(--color-roi)"
          fillOpacity={0.18}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function RouteNotFound({ t, trendsHref }: { t: UiText; trendsHref: string }) {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 py-12 text-center sm:px-6 lg:px-8">
      <Badge variant="outline">{t.routeDetailPage}</Badge>
      <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">{t.routeNotFound}</h1>
      <p className="max-w-xl text-sm text-muted-foreground">{t.routeNotFoundHint}</p>
      <Button asChild>
        <Link href={trendsHref}>
          <ArrowLeftIcon />
          {t.backToTrends}
        </Link>
      </Button>
    </main>
  );
}

function RouteLoading({ t }: { t: UiText }) {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 py-12 text-center sm:px-6 lg:px-8">
      <Badge variant="outline">{t.routeDetailPage}</Badge>
      <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">{t.loadingMarketData}</h1>
    </main>
  );
}

export function MarketRouteDetailPage({ initialData, initialLocale, dataSource, routeKey }: MarketRouteDetailPageProps) {
  const [marketData, setMarketData] = useState(initialData);
  const [trendIndex, setTrendIndex] = useState<MarketTrendIndex | null>(null);
  const [remoteError, setRemoteError] = useState("");
  const [locale, setLocale] = useState<Locale>(initialLocale);

  const t = UI_TEXT[locale];
  const localeRoute = getLocaleRoute(locale);
  const trendsHref = `/${localeRoute}/trends`;

  useEffect(() => {
    setLocale(initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    if (!dataSource.baseUrl) {
      return;
    }

    const abortController = new AbortController();

    async function loadRemoteData() {
      try {
        const manifest = await fetchJson<MarketDataManifest>(resolveRemoteUrl(dataSource.baseUrl, dataSource.manifestPath));
        const snapshotUrl = resolveRemoteUrl(dataSource.baseUrl, manifest.snapshot.url);
        const [snapshot, trend] = await Promise.all([
          fetchJson<MarketData>(snapshotUrl),
          fetchJson<MarketTrendIndex>(resolveRemoteUrl(dataSource.baseUrl, dataSource.trendIndexPath)).catch(() => null)
        ]);

        if (abortController.signal.aborted) {
          return;
        }

        setMarketData(snapshot);
        setTrendIndex(trend);
        setRemoteError("");
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setRemoteError(error instanceof Error ? error.message : t.noSnapshot);
      }
    }

    loadRemoteData();

    return () => {
      abortController.abort();
    };
  }, [dataSource.baseUrl, dataSource.manifestPath, dataSource.trendIndexPath, t.noSnapshot]);

  const row = useMemo(() => getTrendRouteRow(marketData.state, trendIndex, routeKey), [marketData.state, routeKey, trendIndex]);
  const latestDate = trendIndex?.generatedAt || marketData.state.importedAt;
  const isWaitingForRequiredRemoteData = dataSource.requireRemote && !remoteError && marketData.state.items.length === 0;

  if (isWaitingForRequiredRemoteData) {
    return (
      <div className="market-shell min-h-screen">
        <RouteLoading t={t} />
      </div>
    );
  }

  if (!row) {
    return (
      <div className="market-shell min-h-screen">
        <RouteNotFound t={t} trendsHref={trendsHref} />
      </div>
    );
  }

  const points = row.roiSeries;
  const delta = getTrendSeriesDelta(points);
  const range = getSeriesRange(points);
  const decision = getDetailDecision(row, delta, t);
  const lotRows = getIntegerRoiRows(row.result);

  return (
    <div className="market-shell min-h-screen">
      <header className="border-b bg-background/80">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/35">POE2</Badge>
                <Badge variant="secondary">{marketData.league || trendIndex?.league.name || "Runes of Aldur"}</Badge>
                <Badge variant="outline">{t.routeDetailPage}</Badge>
              </div>
              <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
                <span className="shrink-0 pt-1">
                  <ItemIcon item={row.item} className="size-10" />
                </span>
                <div className="min-w-0">
                  <h1 className="line-clamp-2 text-2xl font-semibold tracking-normal sm:text-3xl" title={formatItemName(row.item, locale)}>
                    {formatItemName(row.item, locale)}
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                    {formatMessage(t.routeTo, {
                      buy: formatItemName({ name: row.mode.buyCurrencyName }, locale),
                      sell: formatItemName({ name: row.mode.sellCurrencyName }, locale)
                    })}{" "}
                    - <LocalSnapshotTime value={latestDate} locale={locale} t={t} />
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button asChild variant="outline">
                <Link href={trendsHref}>
                  <ArrowLeftIcon />
                  {t.backToTrends}
                </Link>
              </Button>
            </div>
          </div>
          {remoteError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {t.noSnapshot}
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="market-panel rounded-lg">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <TrendingUpIcon />
                {t.recentBehavior}
              </CardDescription>
              <CardTitle>{t.trendChart}</CardTitle>
            </CardHeader>
            <CardContent>
              <RouteTrendChart points={points} locale={locale} t={t} />
            </CardContent>
          </Card>

          <Card className="market-panel rounded-lg">
            <CardHeader>
              <CardDescription>{t.signalSummary}</CardDescription>
              <CardTitle>
                <Badge variant={decision.variant}>{decision.title}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">{decision.description}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <MetricBlock label={t.currentRoi} value={formatPercent(row.result.roi, locale)} tone="primary" />
                <MetricBlock label={t.trendDelta} value={delta === null ? "--" : formatPercent(delta, locale)} />
                <MetricBlock label={t.persistence24h} value={formatPersistenceValue(row.persistence24h, locale)} />
                <MetricBlock label={t.persistence7d} value={formatPersistenceValue(row.persistence7d, locale)} />
                <MetricBlock label={t.volume} value={formatNumber(row.result.volume, 0, locale)} />
                <MetricBlock label={t.stock} value={formatNumber(row.result.stock, 0, locale)} />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-3 lg:grid-cols-3">
          <Card className="market-panel rounded-lg lg:col-span-2">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <ArrowDownUpIcon />
                {t.priceContext}
              </CardDescription>
              <CardTitle>{t.route}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border bg-background/45 px-3 py-3 sm:col-span-2">
                <div className="mb-3 flex items-center gap-2">
                  <CategoryBadge item={row.item} tag={row.item.tag || row.result.target.tag} locale={locale} />
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-sm">
                  <CurrencyName name={row.mode.buyCurrencyName} locale={locale} compact />
                  <ArrowDownUpIcon className="text-primary" />
                  <CurrencyName name={row.mode.sellCurrencyName} locale={locale} compact />
                </div>
              </div>
              <MetricBlock label={t.buyPrice} value={formatNumber(row.result.buyPrice, 2, locale)} />
              <MetricBlock label={t.sellPrice} value={formatNumber(row.result.sellPrice, 2, locale)} />
              <MetricBlock label={t.profit} value={formatNumber(row.result.netProfitInBuyCurrency, 2, locale)} tone="primary" />
              <MetricBlock
                label={t.roiRange}
                value={range ? `${formatPercent(range.min, locale)} / ${formatPercent(range.max, locale)}` : "--"}
              />
              <MetricBlock label={t.samples} value={formatNumber(points.length, 0, locale)} />
              <MetricBlock
                label={t.gold}
                value={row.result.goldPerDivineProfit === null ? "--" : formatNumber(row.result.goldPerDivineProfit, 0, locale)}
              />
            </CardContent>
          </Card>

          <Card className="market-panel rounded-lg">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <ListChecksIcon />
                {t.executionLots}
              </CardDescription>
              <CardTitle>{t.roundLots}</CardTitle>
            </CardHeader>
            <CardContent>
              {lotRows.length ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.itemCount}</TableHead>
                        <TableHead>{t.buy}</TableHead>
                        <TableHead>{t.sell}</TableHead>
                        <TableHead>{t.roi}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lotRows.slice(0, 5).map((lot) => (
                        <TableRow key={`${lot.itemCount}-${lot.buyCurrencyCount}-${lot.sellCurrencyCount}`}>
                          <TableCell>{formatNumber(lot.itemCount, 0, locale)}</TableCell>
                          <TableCell>{formatNumber(lot.buyCurrencyCount, 0, locale)}</TableCell>
                          <TableCell>{formatNumber(lot.sellCurrencyCount, 0, locale)}</TableCell>
                          <TableCell className="font-medium text-primary">{formatPercent(lot.roi, locale)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="rounded-md border bg-background/45 px-3 py-8 text-center text-sm text-muted-foreground">
                  {formatMessage(t.noIntegerLot, { deviation: "8" })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

      </main>
    </div>
  );
}
