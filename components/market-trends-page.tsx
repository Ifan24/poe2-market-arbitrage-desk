"use client";

import {
  ArrowDownUpIcon,
  BarChart3Icon,
  FilterIcon,
  GemIcon,
  LanguagesIcon,
  RefreshCcwIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrendingUpIcon,
  WavesIcon
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { CategoryBadge, CategoryIcon, CurrencyName, ItemIcon } from "@/components/market-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MarketData, MarketItem } from "@/lib/market-data";
import type { MarketDataManifest, MarketDataSourceConfig } from "@/lib/market-data-source";
import { normalizeFilters, type MarketFilters } from "@/lib/market-arbitrage";
import { getLocaleRoute, replaceLocaleInPath, type Locale } from "@/lib/locale";
import { getTrendRouteHref } from "@/lib/trend-route-links";
import {
  LOCALE_OPTIONS,
  LOCALE_TRIGGER_LABELS,
  UI_TEXT,
  formatDate,
  formatItemName,
  formatMessage,
  formatNumber,
  formatPercent,
  formatTag,
  type UiText
} from "@/lib/market-locale";
import type { MarketTrendIndex, ProfitPersistenceWindow } from "@/lib/market-trend-index";
import type { TrendSeriesPoint } from "@/lib/market-trend-index";
import {
  buildTrendRows,
  filterTrendRows,
  getTrendRouteInsights,
  getTrendSeriesDelta,
  getTrendCategories,
  type TrendRouteInsight,
  type TrendRouteRow
} from "@/lib/trends-model";

type MarketTrendsPageProps = {
  initialData: MarketData;
  initialLocale: Locale;
  dataSource: MarketDataSourceConfig;
};

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

function useIsMobileLayout() {
  const [isMobileLayout, setIsMobileLayout] = useState<boolean | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateLayout = () => setIsMobileLayout(mediaQuery.matches);

    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);
    return () => mediaQuery.removeEventListener("change", updateLayout);
  }, []);

  return isMobileLayout;
}

function CompactPersistenceLine({
  label,
  value,
  locale
}: {
  label: string;
  value: ProfitPersistenceWindow | null;
  locale: Locale;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right">
        {value?.percent === null || !value ? (
          <span className="text-muted-foreground">--</span>
        ) : (
          <>
            <span className="font-medium text-foreground">{formatPercent(value.percent, locale)}</span>
            <span className="ml-1 text-xs text-muted-foreground">
              {formatNumber(value.profitableSamples, 0, locale)}/{formatNumber(value.totalSamples, 0, locale)}
            </span>
          </>
        )}
      </span>
    </div>
  );
}

function ConfidenceCell({
  row,
  locale,
  t
}: {
  row: TrendRouteRow;
  locale: Locale;
  t: UiText;
}) {
  return (
    <div className="flex min-w-[150px] flex-col gap-1.5">
      <CompactPersistenceLine label={t.persistence24h} value={row.persistence24h} locale={locale} />
      <CompactPersistenceLine label={t.persistence7d} value={row.persistence7d} locale={locale} />
    </div>
  );
}

function LiquidityCell({ row, locale, t }: { row: TrendRouteRow; locale: Locale; t: UiText }) {
  return (
    <div className="flex min-w-[120px] flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-muted-foreground">{t.volume}</span>
        <span className="font-medium tabular-nums">{formatNumber(row.result.volume, 0, locale)}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-muted-foreground">{t.stock}</span>
        <span className="tabular-nums text-muted-foreground">{formatNumber(row.result.stock, 0, locale)}</span>
      </div>
    </div>
  );
}

function RouteCell({ row, locale }: { row: TrendRouteRow; locale: Locale }) {
  return (
    <div className="flex min-w-[170px] flex-col gap-1.5 text-sm">
      <CurrencyName name={row.mode.buyCurrencyName} locale={locale} compact />
      <div className="flex items-center gap-2 pl-3 text-muted-foreground">
        <ArrowDownUpIcon className="size-3.5" />
        <CurrencyName name={row.mode.sellCurrencyName} locale={locale} compact />
      </div>
    </div>
  );
}

function CompactRouteLine({ row, locale }: { row: TrendRouteRow; locale: Locale }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <CurrencyName name={row.mode.buyCurrencyName} locale={locale} compact />
      <ArrowDownUpIcon className="size-3.5 shrink-0 text-primary" />
      <CurrencyName name={row.mode.sellCurrencyName} locale={locale} compact />
    </div>
  );
}

function RouteTargetBlock({ row, locale }: { row: TrendRouteRow; locale: Locale }) {
  return (
    <div className="flex items-start gap-3">
      <div className="pt-0.5">
        <ItemIcon item={row.item} />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="line-clamp-2 max-w-[220px] break-words font-medium" title={formatItemName(row.item, locale)}>
          {formatItemName(row.item, locale)}
        </div>
        <div>
          <CategoryBadge item={row.item} tag={row.item.tag || row.result.target.tag} locale={locale} />
        </div>
      </div>
    </div>
  );
}

function MobileMetric({
  label,
  children,
  className = ""
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 border-t pt-2 ${className}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 min-w-0 font-medium">{children}</div>
    </div>
  );
}

function MobileTrendRouteCard({
  row,
  locale,
  t,
  onOpen
}: {
  row: TrendRouteRow;
  locale: Locale;
  t: UiText;
  onOpen: (row: TrendRouteRow) => void;
}) {
  return (
    <div className="rounded-lg border bg-background/35 p-3" data-testid="trend-mobile-route-card">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <RouteTargetBlock row={row} locale={locale} />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={t.details}
            data-testid="trend-mobile-route-details"
            onClick={() => onOpen(row)}
          >
            <BarChart3Icon />
          </Button>
        </div>
        <div className="rounded-md border bg-background/35 px-2.5 py-2">
          <CompactRouteLine row={row} locale={locale} />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm" data-testid="trend-mobile-compact-metrics">
          <MobileMetric label={t.currentRoi}>
            <span className="text-primary">{formatPercent(row.result.roi, locale)}</span>
          </MobileMetric>
          <MobileMetric label={t.trendChart}>
            <RouteTrendSparkline points={row.roiSeries} locale={locale} />
          </MobileMetric>
          <MobileMetric label={t.persistence24h}>
            {formatPersistenceValue(row.persistence24h, locale)}
          </MobileMetric>
          <MobileMetric label={t.persistence7d}>
            {formatPersistenceValue(row.persistence7d, locale)}
          </MobileMetric>
          <MobileMetric label={t.volume}>
            {formatNumber(row.result.volume, 0, locale)}
          </MobileMetric>
          <MobileMetric label={t.stock}>
            <span className="text-muted-foreground">{formatNumber(row.result.stock, 0, locale)}</span>
          </MobileMetric>
        </div>
        <Button asChild type="button" variant="outline" size="sm">
          <Link href={getTrendRouteHref(locale, row.key)}>
            <BarChart3Icon data-icon="inline-start" />
            {t.openRoutePage}
          </Link>
        </Button>
      </div>
    </div>
  );
}

const roiChartConfig = {
  roi: {
    label: "ROI",
    color: "var(--primary)"
  }
} satisfies ChartConfig;

function RouteTrendSparkline({ points, locale }: { points: TrendSeriesPoint[]; locale: Locale }) {
  if (points.length < 2) {
    return <span className="text-muted-foreground">--</span>;
  }

  const first = points[0];
  const latest = points.at(-1) || first;
  const delta = latest.roi - first.roi;
  const chartData = points.map((point, index) => ({
    index,
    roi: point.roi
  }));

  return (
    <div className="flex min-w-[150px] items-center gap-3">
      <ChartContainer config={roiChartConfig} className="aspect-auto h-12 w-24">
        <AreaChart accessibilityLayer data={chartData} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
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
      <span className="text-sm font-medium text-primary">{formatPercent(delta, locale)}</span>
    </div>
  );
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

function DetailDecisionPanel({
  row,
  delta,
  locale,
  t
}: {
  row: TrendRouteRow;
  delta: number | null;
  locale: Locale;
  t: UiText;
}) {
  const decision = getDetailDecision(row, delta, t);
  const persistence = row.persistence7d?.percent;

  return (
    <div className="rounded-lg border bg-background/45 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Badge variant={decision.variant}>{decision.title}</Badge>
          <p className="mt-2 text-sm text-muted-foreground">{decision.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Badge variant="outline">
            {t.persistence7d} {persistence === null || persistence === undefined ? "--" : formatPercent(persistence, locale)}
          </Badge>
          <Badge variant="outline">
            {t.trendDelta} {delta === null ? "--" : formatPercent(delta, locale)}
          </Badge>
          <Badge variant="outline">
            {t.volume} {formatNumber(row.result.volume, 0, locale)}
          </Badge>
          <Badge variant="outline">
            {t.stock} {formatNumber(row.result.stock, 0, locale)}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function RouteTrendDetailDialog({
  row,
  locale,
  t,
  onClose
}: {
  row: TrendRouteRow | null;
  locale: Locale;
  t: UiText;
  onClose: () => void;
}) {
  const points = row?.roiSeries || [];
  const delta = getTrendSeriesDelta(points);
  const range = getSeriesRange(points);
  const chartData = points.map((point, index) => ({
    sample: index + 1,
    roi: point.roi
  }));

  return (
    <Dialog open={Boolean(row)} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent closeLabel={t.close} className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl">
        {row ? (
          <>
            <DialogHeader>
              <DialogTitle>{formatItemName(row.item, locale)}</DialogTitle>
              <DialogDescription>
                {formatMessage(t.routeTo, {
                  buy: formatItemName({ name: row.mode.buyCurrencyName }, locale),
                  sell: formatItemName({ name: row.mode.sellCurrencyName }, locale)
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-3">
                <ItemIcon item={row.item} />
                <CategoryBadge item={row.item} tag={row.item.tag || row.result.target.tag} locale={locale} />
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                  <CurrencyName name={row.mode.buyCurrencyName} locale={locale} compact />
                  <ArrowDownUpIcon />
                  <CurrencyName name={row.mode.sellCurrencyName} locale={locale} compact />
                </div>
              </div>

              <DetailDecisionPanel row={row} delta={delta} locale={locale} t={t} />

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricBlock label={t.currentRoi} value={formatPercent(row.result.roi, locale)} />
                <MetricBlock label={t.trendDelta} value={delta === null ? "--" : formatPercent(delta, locale)} />
                <MetricBlock
                  label={t.roiRange}
                  value={range ? `${formatPercent(range.min, locale)} / ${formatPercent(range.max, locale)}` : "--"}
                />
                <MetricBlock label={t.samples} value={formatNumber(points.length, 0, locale)} />
                <MetricBlock label={t.persistence24h} value={formatPersistenceValue(row.persistence24h, locale)} />
                <MetricBlock label={t.persistence7d} value={formatPersistenceValue(row.persistence7d, locale)} />
                <MetricBlock label={t.volume} value={formatNumber(row.result.volume, 0, locale)} />
                <MetricBlock label={t.stock} value={formatNumber(row.result.stock, 0, locale)} />
              </div>

              {chartData.length >= 2 ? (
                <ChartContainer config={roiChartConfig} className="aspect-auto h-64 w-full">
                  <AreaChart accessibilityLayer data={chartData} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="sample" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} width={44} tickFormatter={(value) => `${value}%`} />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(value) => (
                            <span className="font-mono font-medium tabular-nums">
                              {formatPercent(Number(value), locale)}
                            </span>
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
              ) : (
                <div className="rounded-md border bg-background/45 px-3 py-8 text-center text-sm text-muted-foreground">
                  {t.lowSampleTrend}
                </div>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function OpportunityFocusCard({
  insight,
  locale,
  t,
  onOpen
}: {
  insight: TrendRouteInsight;
  locale: Locale;
  t: UiText;
  onOpen: (row: TrendRouteRow) => void;
}) {
  const icon = insight.kind === "consistent"
    ? <ShieldCheckIcon />
    : insight.kind === "improving"
      ? <TrendingUpIcon />
      : <WavesIcon />;
  const title = insight.kind === "consistent"
    ? t.mostConsistent
    : insight.kind === "improving"
      ? t.improvingNow
      : t.strongestFlow;
  const description = insight.kind === "consistent"
    ? t.mostConsistentHint
    : insight.kind === "improving"
      ? t.improvingNowHint
      : t.strongestFlowHint;

  return (
    <Card className="market-panel rounded-lg" data-testid={`trend-insight-${insight.kind}`}>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          {icon}
          {title}
        </CardDescription>
        <CardTitle className="flex min-w-0 items-start gap-2 text-base leading-snug">
          <span className="mt-0.5 shrink-0">
            <ItemIcon item={insight.row.item} />
          </span>
          <span className="line-clamp-2 min-w-0 max-w-full break-words" title={formatItemName(insight.row.item, locale)}>
            {formatItemName(insight.row.item, locale)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge
            item={insight.row.item}
            tag={insight.row.item.tag || insight.row.result.target.tag}
            locale={locale}
          />
          <span className="text-sm text-muted-foreground">
            {formatMessage(t.routeTo, {
              buy: formatItemName({ name: insight.row.mode.buyCurrencyName }, locale),
              sell: formatItemName({ name: insight.row.mode.sellCurrencyName }, locale)
            })}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <MetricBlock label={t.currentRoi} value={formatPercent(insight.row.result.roi, locale)} />
          <MetricBlock
            label={t.trendDelta}
            value={insight.delta === null ? "--" : formatPercent(insight.delta, locale)}
          />
          <MetricBlock label={t.persistence7d} value={formatPersistenceValue(insight.row.persistence7d, locale)} />
          <MetricBlock label={t.volume} value={formatNumber(insight.row.result.volume, 0, locale)} />
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          data-testid={`trend-insight-${insight.kind}-details`}
          onClick={() => onOpen(insight.row)}
        >
          <BarChart3Icon data-icon="inline-start" />
          {t.openDetails}
        </Button>
        <Button asChild variant="outline" size="sm" className="self-start">
          <Link href={getTrendRouteHref(locale, insight.row.key)}>
            <BarChart3Icon data-icon="inline-start" />
            {t.openRoutePage}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/45 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}

function formatPersistenceValue(value: ProfitPersistenceWindow | null, locale: Locale) {
  if (!value || value.percent === null) {
    return "--";
  }

  return `${formatPercent(value.percent, locale)} (${formatNumber(value.profitableSamples, 0, locale)}/${formatNumber(value.totalSamples, 0, locale)})`;
}

function LocalSnapshotTime({
  value,
  locale,
  t
}: {
  value: string | undefined;
  locale: Locale;
  t: UiText;
}) {
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

export function MarketTrendsPage({ initialData, initialLocale, dataSource }: MarketTrendsPageProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [marketData, setMarketData] = useState(initialData);
  const [trendIndex, setTrendIndex] = useState<MarketTrendIndex | null>(null);
  const [trendError, setTrendError] = useState("");
  const [remoteError, setRemoteError] = useState("");
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [minSamples, setMinSamples] = useState("0");
  const [min24h, setMin24h] = useState("0");
  const [min7d, setMin7d] = useState("0");
  const [marketFilters, setMarketFilters] = useState<MarketFilters>(() => normalizeFilters(undefined));
  const [selectedRow, setSelectedRow] = useState<TrendRouteRow | null>(null);
  const isMobileLayout = useIsMobileLayout();

  const t = UI_TEXT[locale];
  const localeRoute = getLocaleRoute(locale);
  const scannerHref = `/${localeRoute}`;
  const storeValueHref = `/${localeRoute}/store-value`;
  const switchLocale = (nextLocale: Locale) => {
    router.push(replaceLocaleInPath(pathname, nextLocale));
  };

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
        setTrendError(trend ? "" : t.trendDataUnavailable);
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
  }, [dataSource.baseUrl, dataSource.manifestPath, dataSource.trendIndexPath, t.noSnapshot, t.trendDataUnavailable]);

  const allRows = useMemo(
    () => buildTrendRows(marketData.state, trendIndex, marketFilters),
    [marketData.state, marketFilters, trendIndex]
  );
  const tagIconItems = useMemo(() => {
    const icons = new Map<string, MarketItem>();
    for (const item of marketData.state.items) {
      const tag = item.tag || item.category;
      if (tag && item.tagIconUrl && !icons.has(tag)) {
        icons.set(tag, item);
      }
    }
    return icons;
  }, [marketData.state.items]);
  const categories = useMemo(() => getTrendCategories(allRows), [allRows]);
  const filteredRows = useMemo(
    () =>
      filterTrendRows(
        allRows,
        {
          query,
          category,
          minSamples: Number(minSamples) || 0,
          minPersistence24h: Number(min24h) || 0,
          minPersistence7d: Number(min7d) || 0
        },
        (item) => formatItemName(item, locale),
        (tag) => formatTag(tag, locale)
      ),
    [allRows, category, locale, min24h, min7d, minSamples, query]
  );
  const rows = useMemo(() => filteredRows.slice(0, 120), [filteredRows]);
  const trendInsights = useMemo(() => getTrendRouteInsights(filteredRows), [filteredRows]);

  const bestRow = filteredRows[0];
  const latestDate = trendIndex?.generatedAt || marketData.state.importedAt;
  const confidenceFilters: Array<{ label: string; value: string; setValue: (next: string) => void }> = [
    { label: t.minSamples, value: minSamples, setValue: setMinSamples },
    { label: t.min24h, value: min24h, setValue: setMin24h },
    { label: t.min7d, value: min7d, setValue: setMin7d }
  ];
  const updateMarketFilter = (key: keyof MarketFilters, value: string) => {
    setMarketFilters((current) => ({ ...current, [key]: value }));
  };
  const resetFilters = () => {
    setQuery("");
    setCategory("all");
    setMinSamples("0");
    setMin24h("0");
    setMin7d("0");
    setMarketFilters(normalizeFilters(undefined));
  };

  useEffect(() => {
    setLocale(initialLocale);
  }, [initialLocale]);

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
              <h1 className="mt-3 text-2xl font-semibold tracking-normal sm:text-3xl">{t.trends}</h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {t.trendConfidenceDescription} - <LocalSnapshotTime value={latestDate} locale={locale} t={t} />
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button asChild variant="outline">
                <Link href={scannerHref}>
                  <SparklesIcon />
                  {t.scanner}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={storeValueHref}>
                  <TrendingUpIcon />
                  {t.storeValue}
                </Link>
              </Button>
              <Button asChild>
                <a href="#trend-routes" data-testid="trend-routes-jump">
                  <ArrowDownUpIcon />
                  {t.viewRankedRoutes}
                </a>
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
          ) : trendError ? (
            <div className="rounded-md border bg-background/45 px-3 py-2 text-sm text-muted-foreground">{trendError}</div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="market-panel rounded-lg">
              <CardHeader>
                <CardDescription>{t.trendRoutes}</CardDescription>
                <CardTitle className="text-2xl text-primary">{formatNumber(filteredRows.length, 0, locale)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="market-panel rounded-lg">
              <CardHeader>
                <CardDescription>{t.bestRoi}</CardDescription>
                <CardTitle className="text-2xl text-primary">{bestRow ? formatPercent(bestRow.result.roi, locale) : "--"}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="market-panel rounded-lg">
              <CardHeader>
                <CardDescription>{t.samples}</CardDescription>
                <CardTitle className="text-2xl text-primary">{formatNumber(trendIndex?.sampleCount || 0, 0, locale)}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section className="market-rail grid gap-3 rounded-lg border p-3 md:grid-cols-[minmax(220px,1fr)_180px_repeat(3,minmax(112px,128px))]">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t.searchTargets}</span>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label={t.searchTargets}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t.category}</span>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder={t.category} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>{t.category}</SelectLabel>
                  <SelectItem value="all">
                    <FilterIcon />
                    {t.allCategories}
                  </SelectItem>
                  {categories.map((itemCategory) => (
                    <SelectItem key={itemCategory} value={itemCategory}>
                      {tagIconItems.get(itemCategory) ? (
                        <CategoryIcon item={tagIconItems.get(itemCategory)!} />
                      ) : (
                        <GemIcon />
                      )}
                      {formatTag(itemCategory, locale)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {confidenceFilters.map(({ label, value, setValue }) => (
            <label key={label} className="flex min-w-0 flex-col gap-1">
              <span className="text-xs text-muted-foreground">{label}</span>
              <Input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                inputMode="numeric"
                aria-label={label}
              />
            </label>
          ))}
        </section>

        <Card className="market-panel rounded-lg">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FilterIcon />
                  {t.marketFilters}
                </CardTitle>
                <CardDescription>{t.filtersHint}</CardDescription>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={resetFilters}>
                <RefreshCcwIcon data-icon="inline-start" />
                {t.resetView}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {[
                ["minTradeValueDivine", t.valueFilter, formatItemName({ name: "Divine Orb" }, locale)],
                ["minStock", t.stockFilter, t.items],
                ["minPriceExalted", t.priceMin, formatItemName({ name: "Exalted Orb" }, locale)],
                ["maxPriceExalted", t.priceMax, formatItemName({ name: "Exalted Orb" }, locale)],
                ["minRoiPercent", t.roiMin, "%"],
                ["maxRoiPercent", t.roiMax, "%"]
              ].map(([key, label, unit]) => (
                <label key={key} className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <Input
                    inputMode="decimal"
                    value={marketFilters[key as keyof MarketFilters]}
                    onChange={(event) => updateMarketFilter(key as keyof MarketFilters, event.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">{unit}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <section>
          <div className="mb-3">
            <h2 className="text-lg font-semibold tracking-normal">{t.opportunityFocus}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.opportunityFocusDescription}</p>
          </div>
          {trendInsights.length ? (
            <div className="grid gap-3 lg:grid-cols-3">
              {trendInsights.map((insight) => (
                <OpportunityFocusCard
                  key={insight.kind}
                  insight={insight}
                  locale={locale}
                  t={t}
                  onOpen={setSelectedRow}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border bg-background/45 px-3 py-8 text-center text-sm text-muted-foreground">
              {t.noFocusedOpportunities}
            </div>
          )}
        </section>

        <Card id="trend-routes" className="market-panel scroll-mt-4 rounded-lg" data-testid="trend-routes-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownUpIcon />
              {t.trendConfidence}
            </CardTitle>
            <CardDescription>{formatMessage(t.profitableRows, { count: formatNumber(filteredRows.length, 0, locale) })}</CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length ? (
              isMobileLayout === null ? (
                <div className="min-h-[320px]" aria-hidden="true" />
              ) : isMobileLayout ? (
                <div className="grid gap-3 md:hidden">
                  {rows.map((row) => (
                    <MobileTrendRouteCard key={row.key} row={row} locale={locale} t={t} onOpen={setSelectedRow} />
                  ))}
                </div>
              ) : (
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.target}</TableHead>
                        <TableHead>{t.route}</TableHead>
                        <TableHead>{t.currentRoi}</TableHead>
                        <TableHead>{t.trendChart}</TableHead>
                        <TableHead>{t.trendConfidence}</TableHead>
                        <TableHead>{t.liquidity}</TableHead>
                        <TableHead>{t.details}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.key}>
                          <TableCell className="min-w-[260px] max-w-[300px]">
                            <RouteTargetBlock row={row} locale={locale} />
                          </TableCell>
                          <TableCell>
                            <RouteCell row={row} locale={locale} />
                          </TableCell>
                          <TableCell className="font-medium text-primary">{formatPercent(row.result.roi, locale)}</TableCell>
                          <TableCell>
                            <RouteTrendSparkline points={row.roiSeries} locale={locale} />
                          </TableCell>
                          <TableCell>
                            <ConfidenceCell row={row} locale={locale} t={t} />
                          </TableCell>
                          <TableCell>
                            <LiquidityCell row={row} locale={locale} t={t} />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                data-testid="trend-row-details"
                                onClick={() => setSelectedRow(row)}
                              >
                                <BarChart3Icon data-icon="inline-start" />
                                {t.details}
                              </Button>
                              <Button asChild variant="outline" size="sm">
                                <Link href={getTrendRouteHref(locale, row.key)}>
                                  <BarChart3Icon data-icon="inline-start" />
                                  {t.openRoutePage}
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            ) : (
              <div className="rounded-md border bg-background/45 px-3 py-8 text-center text-sm text-muted-foreground">
                {t.noTrendRows}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <RouteTrendDetailDialog row={selectedRow} locale={locale} t={t} onClose={() => setSelectedRow(null)} />
    </div>
  );
}
