"use client";

import { ArrowDownUpIcon, BarChart3Icon, FilterIcon, LanguagesIcon, SearchIcon, SparklesIcon, TrendingUpIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart } from "recharts";

import { CategoryBadge, ItemIcon } from "@/components/market-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildAppreciationRows, filterAppreciationRows } from "@/lib/appreciation-model";
import { getLocaleRoute, replaceLocaleInPath, type Locale } from "@/lib/locale";
import type { MarketData } from "@/lib/market-data";
import type { MarketDataManifest, MarketDataSourceConfig } from "@/lib/market-data-source";
import {
  LOCALE_OPTIONS,
  LOCALE_TRIGGER_LABELS,
  UI_TEXT,
  formatDate,
  formatItemName,
  formatNumber,
  formatPercent,
  type UiText
} from "@/lib/market-locale";
import type { AppreciationSignal } from "@/lib/market-appreciation-index";
import type { MarketTrendIndex } from "@/lib/market-trend-index";

type MarketAppreciationPageProps = {
  initialData: MarketData;
  initialLocale: Locale;
  dataSource: MarketDataSourceConfig;
};

const priceChartConfig = {
  priceDivine: {
    label: "Divine",
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

function getSignalLabel(signal: AppreciationSignal, t: UiText) {
  return {
    rising: t.rising,
    stable: t.stableSignal,
    volatile: t.volatile,
    thin: t.thin
  }[signal];
}

function getSignalVariant(signal: AppreciationSignal): "default" | "secondary" | "outline" | "destructive" {
  const variants: Record<AppreciationSignal, "default" | "secondary" | "outline" | "destructive"> = {
    rising: "default",
    stable: "secondary",
    volatile: "destructive",
    thin: "outline"
  };

  return variants[signal];
}

function PriceSparkline({ points }: { points: Array<{ at: string; priceDivine: number }> }) {
  if (points.length < 2) {
    return <span className="text-muted-foreground">--</span>;
  }

  return (
    <ChartContainer config={priceChartConfig} className="aspect-auto h-12 w-24">
      <AreaChart accessibilityLayer data={points.map((point, index) => ({ index, priceDivine: point.priceDivine }))} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
        <Area
          dataKey="priceDivine"
          type="monotone"
          stroke="var(--color-priceDivine)"
          strokeWidth={2}
          fill="var(--color-priceDivine)"
          fillOpacity={0.18}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function MarketAppreciationPage({ initialData, initialLocale, dataSource }: MarketAppreciationPageProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [marketData, setMarketData] = useState(initialData);
  const [trendIndex, setTrendIndex] = useState<MarketTrendIndex | null>(null);
  const [remoteError, setRemoteError] = useState("");
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [query, setQuery] = useState("");
  const [signal, setSignal] = useState<"all" | AppreciationSignal>("all");

  const t = UI_TEXT[locale];
  const localeRoute = getLocaleRoute(locale);
  const trendsHref = `/${localeRoute}/trends`;
  const scannerHref = `/${localeRoute}`;

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

    return () => abortController.abort();
  }, [dataSource.baseUrl, dataSource.manifestPath, dataSource.trendIndexPath, t.noSnapshot]);

  const allRows = useMemo(
    () => buildAppreciationRows(trendIndex?.appreciation, marketData.state.items),
    [marketData.state.items, trendIndex?.appreciation]
  );
  const rows = useMemo(() => filterAppreciationRows(allRows, query, signal), [allRows, query, signal]);
  const appreciationUnavailable = Boolean(trendIndex && !trendIndex.appreciation);
  const latestDate = trendIndex?.appreciation?.generatedAt || trendIndex?.generatedAt || marketData.state.importedAt;
  const bestRow = rows[0];

  const switchLocale = (nextLocale: Locale) => {
    router.push(replaceLocaleInPath(pathname, nextLocale));
  };

  return (
    <div className="market-shell min-h-screen">
      <header className="border-b bg-background/80">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background/35">POE2</Badge>
                <Badge variant="secondary">{marketData.league || trendIndex?.league.name || "Runes of Aldur"}</Badge>
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-normal sm:text-3xl">{t.storeValue}</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {t.appreciationSignalsDescription} - <LocalSnapshotTime value={latestDate} locale={locale} t={t} />
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button asChild variant="outline">
                <Link href={trendsHref}>
                  <BarChart3Icon />
                  {t.trends}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={scannerHref}>
                  <SparklesIcon />
                  {t.scanner}
                </Link>
              </Button>
              <Select value={locale} onValueChange={(value) => switchLocale(value as Locale)}>
                <SelectTrigger
                  aria-label={`${t.language}: ${LOCALE_OPTIONS.find((option) => option.value === locale)?.label ?? locale}`}
                  className="w-full justify-start sm:w-24"
                >
                  <LanguagesIcon />
                  <span>{LOCALE_TRIGGER_LABELS[locale]}</span>
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectGroup>
                    <SelectLabel>{t.language}</SelectLabel>
                    {LOCALE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          {remoteError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {t.noSnapshot}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="market-panel rounded-lg">
              <CardHeader>
                <CardDescription>{t.appreciationSignals}</CardDescription>
                <CardTitle className="text-2xl text-primary">{formatNumber(rows.length, 0, locale)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="market-panel rounded-lg">
              <CardHeader>
                <CardDescription>{t.trendDelta}</CardDescription>
                <CardTitle className="text-2xl text-primary">
                  {bestRow?.asset.windows["7d"].changePercent === null || !bestRow ? "--" : formatPercent(bestRow.asset.windows["7d"].changePercent, locale)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="market-panel rounded-lg">
              <CardHeader>
                <CardDescription>{t.confidence}</CardDescription>
                <CardTitle className="text-2xl text-primary">{bestRow ? formatNumber(bestRow.asset.confidence, 0, locale) : "--"}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="market-rail grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(220px,1fr)_220px]">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t.searchTargets}</span>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t.searchTargets} className="pl-9" />
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t.signal}</span>
            <Select value={signal} onValueChange={(value) => setSignal(value as "all" | AppreciationSignal)}>
              <SelectTrigger>
                <SelectValue placeholder={t.signal} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{t.signal}</SelectLabel>
                  <SelectItem value="all">
                    <FilterIcon />
                    {t.allCategories}
                  </SelectItem>
                  {(["rising", "stable", "volatile", "thin"] as AppreciationSignal[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      <TrendingUpIcon />
                      {getSignalLabel(value, t)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </section>

        <Card className="market-panel rounded-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon />
              {t.appreciationSignals}
            </CardTitle>
            <CardDescription>{t.appreciationSignalsDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.target}</TableHead>
                      <TableHead>{t.signal}</TableHead>
                      <TableHead>{t.currentPrice}</TableHead>
                      <TableHead>{t.trendChart}</TableHead>
                      <TableHead>{t.trendDelta}</TableHead>
                      <TableHead>{t.volatility}</TableHead>
                      <TableHead>{t.liquidity}</TableHead>
                      <TableHead>{t.confidence}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="min-w-[260px]">
                          <div className="flex items-start gap-3">
                            <span className="pt-0.5">
                              <ItemIcon item={row.item || { id: row.asset.itemId, name: row.asset.name, category: row.asset.category }} />
                            </span>
                            <div className="min-w-0">
                              <div className="line-clamp-2 font-medium" title={formatItemName({ name: row.asset.name }, locale)}>
                                {formatItemName({ name: row.asset.name }, locale)}
                              </div>
                              <div className="mt-2">
                                <CategoryBadge
                                  item={row.item || { id: row.asset.itemId, name: row.asset.name, category: row.asset.category }}
                                  tag={row.asset.tag || row.asset.category}
                                  locale={locale}
                                />
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSignalVariant(row.asset.signal)}>{getSignalLabel(row.asset.signal, t)}</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-primary">
                          {formatNumber(row.asset.currentPriceDivine, 2, locale)} Divine
                        </TableCell>
                        <TableCell>
                          <PriceSparkline points={row.asset.series} />
                        </TableCell>
                        <TableCell>{row.asset.windows["7d"].changePercent === null ? "--" : formatPercent(row.asset.windows["7d"].changePercent, locale)}</TableCell>
                        <TableCell>{row.asset.windows["7d"].volatilityPercent === null ? "--" : formatPercent(row.asset.windows["7d"].volatilityPercent, locale)}</TableCell>
                        <TableCell>
                          <div className="flex min-w-[120px] flex-col gap-1 text-sm">
                            <span>{t.volume} {formatNumber(row.asset.currentVolume, 0, locale)}</span>
                            <span className="text-muted-foreground">{t.stock} {formatNumber(row.asset.currentStock, 0, locale)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatNumber(row.asset.confidence, 0, locale)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border bg-background/45 px-3 py-8 text-center text-sm text-muted-foreground">
                {appreciationUnavailable ? t.appreciationDataUnavailable : t.trendDataUnavailable}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
