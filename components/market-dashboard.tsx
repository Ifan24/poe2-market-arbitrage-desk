"use client";

import {
  ArrowDownUpIcon,
  BarChart3Icon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CoinsIcon,
  FilterIcon,
  GemIcon,
  LanguagesIcon,
  ListFilterIcon,
  PencilRulerIcon,
  RefreshCcwIcon,
  RouteIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  StarIcon
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { toast } from "sonner";

import { LandingHelperToast } from "@/components/landing-helper-toast";
import {
  CategoryBadge,
  CategoryIcon,
  CurrencyMark,
  CurrencyName,
  ItemIcon
} from "@/components/market-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  asNumber,
  DEFAULT_MARKET_FILTERS,
  type BestCurrencySide,
  getDefaultPlannerValues,
  getIntegerRoiRows,
  getIntegerTradeRows,
  getManualPlannerResult,
  MAX_INTEGER_PRICE_DEVIATION_PERCENT,
  normalizeFilters,
  type MarketFilters,
  type MarketRoute,
  type TargetResult
} from "@/lib/market-arbitrage";
import { buildDashboardModel, type TargetOption } from "@/lib/dashboard-model";
import {
  loadDismissedSnapshotReminderSlot,
  loadDashboardPreferences,
  saveDashboardPreferences,
  saveDismissedSnapshotReminderSlot,
  setDocumentLocale
} from "@/lib/dashboard-preferences";
import type { MarketData, MarketItem } from "@/lib/market-data";
import type {
  MarketDataManifest,
  MarketDataSourceConfig,
  MarketDataStatus
} from "@/lib/market-data-source";
import { getLocaleRoute, replaceLocaleInPath, type Locale } from "@/lib/locale";
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
import { cn } from "@/lib/utils";

type DashboardProps = {
  initialData: MarketData;
  initialLocale: Locale;
  dataSource: MarketDataSourceConfig;
};

const PAGE_SIZE = 18;
const ALL_ROUTE_KEY = "all-routes";
const MARKET_VALUE_DIGITS = 3;
const HOURLY_REFRESH_MINUTE = 17;
const SNAPSHOT_PROMPT_GRACE_MINUTES = 5;
const SNAPSHOT_REMINDER_CHECK_INTERVAL_MS = 60 * 1000;
const SNAPSHOT_REMINDER_TOAST_ID = "snapshot-refresh-reminder";

function getHourlySnapshotRefreshSlot(now = new Date()) {
  const scheduledRefreshAt = new Date(now);
  scheduledRefreshAt.setMinutes(HOURLY_REFRESH_MINUTE, 0, 0);
  return scheduledRefreshAt.toISOString();
}

function shouldShowHourlySnapshotReminder(
  importedAt: string | undefined,
  dismissedSlot: string,
  now = new Date()
) {
  const promptMinute = HOURLY_REFRESH_MINUTE + SNAPSHOT_PROMPT_GRACE_MINUTES;
  const scheduledRefreshAt = new Date(now);
  scheduledRefreshAt.setMinutes(HOURLY_REFRESH_MINUTE, 0, 0);

  const promptAt = new Date(now);
  promptAt.setMinutes(promptMinute, 0, 0);

  if (now < promptAt) {
    return false;
  }

  if (dismissedSlot === scheduledRefreshAt.toISOString()) {
    return false;
  }

  if (!importedAt) {
    return true;
  }

  const importedAtMs = Date.parse(importedAt);
  return Number.isNaN(importedAtMs) || importedAtMs < scheduledRefreshAt.getTime();
}

function SnapshotUpdatePrompt({ importedAt, t }: { importedAt?: string; t: UiText }) {
  const [dismissedSlot, setDismissedSlot] = useState(() => loadDismissedSnapshotReminderSlot());

  useEffect(() => {
    function checkRefreshWindow() {
      if (!shouldShowHourlySnapshotReminder(importedAt, dismissedSlot)) {
        toast.dismiss(SNAPSHOT_REMINDER_TOAST_ID);
        return;
      }

      toast(t.newSnapshotAvailable, {
        id: SNAPSHOT_REMINDER_TOAST_ID,
        description: t.newSnapshotAvailableHint,
        duration: Infinity,
        action: {
          label: t.refreshPage,
          onClick: () => {
            const slot = getHourlySnapshotRefreshSlot();
            saveDismissedSnapshotReminderSlot(slot);
            setDismissedSlot(slot);
            window.location.reload();
          }
        }
      });
    }

    const intervalId = window.setInterval(checkRefreshWindow, SNAPSHOT_REMINDER_CHECK_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        checkRefreshWindow();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    checkRefreshWindow();

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dismissedSlot, importedAt]);

  return null;
}

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

function getFreshnessKind(
  importedAt: string | undefined,
  manifest: MarketDataManifest | null,
  now = Date.now()
) {
  const importedAtMs = importedAt ? Date.parse(importedAt) : Number.NaN;
  if (!Number.isFinite(importedAtMs)) {
    return "very-stale";
  }

  const staleAfterMinutes = manifest?.staleAfterMinutes ?? 90;
  const veryStaleAfterMinutes = manifest?.veryStaleAfterMinutes ?? 240;
  const ageMinutes = Math.max(0, (now - importedAtMs) / 60000);

  if (ageMinutes > veryStaleAfterMinutes) {
    return "very-stale";
  }
  if (ageMinutes > staleAfterMinutes) {
    return "stale";
  }
  return "fresh";
}

function FreshnessBadge({
  importedAt,
  manifest,
  status
}: {
  importedAt?: string;
  manifest: MarketDataManifest | null;
  status: MarketDataStatus | null;
}) {
  const kind = getFreshnessKind(importedAt, manifest);
  const statusOk = status?.ok ?? true;
  const label = !statusOk
    ? "Refresh failed"
    : kind === "very-stale"
      ? "Very stale"
      : kind === "stale"
        ? "Stale"
        : "Fresh";
  const variant = !statusOk || kind === "very-stale" ? "destructive" : kind === "stale" ? "outline" : "secondary";

  return (
    <Badge variant={variant} className="justify-center">
      {label}
    </Badge>
  );
}

function SearchableTargetSelect({
  options,
  value,
  onValueChange,
  locale,
  t
}: {
  options: TargetOption[];
  value: string;
  onValueChange: (value: string) => void;
  locale: Locale;
  t: UiText;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedOption = options.find((option) => option.item.id === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) => {
        const name = formatItemName(option.item, locale);
        return `${name} ${option.item.name} ${option.item.tag || ""}`.toLowerCase().includes(normalizedQuery);
      })
    : options;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full min-w-0 justify-between px-3 sm:min-w-64 sm:flex-1 sm:shrink lg:w-[360px] lg:flex-none"
        >
          <span className="flex min-w-0 items-center gap-2">
            {selectedOption ? <ItemIcon item={selectedOption.item} className="size-5" /> : <SearchIcon />}
            <span className="truncate">
              {selectedOption ? formatItemName(selectedOption.item, locale) : t.selectTarget}
            </span>
          </span>
          <SearchIcon className="opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,28rem)] p-0">
        <div className="border-b p-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.searchTargets}
            className="h-9"
            autoFocus
          />
        </div>
        <ScrollArea className="h-72">
          <div className="p-1">
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  onClick={() => {
                    onValueChange(option.item.id);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <ItemIcon item={option.item} className="size-6" />
                  <span className="min-w-0 flex-1 truncate">{formatItemName(option.item, locale)}</span>
                  {option.item.id === value ? <CheckIcon className="size-4 text-primary" /> : null}
                </button>
              ))
            ) : (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">{t.noTargetsFound}</div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function RouteSummary({ mode, locale }: { mode: MarketRoute; locale: Locale }) {
  return (
    <div className="route-thread grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-md border bg-muted/45 px-3 py-2">
      <span className="relative z-10 min-w-0 rounded px-1">
        <CurrencyName name={mode.buyCurrencyName} locale={locale} compact />
      </span>
      <ArrowDownUpIcon className="relative z-10 text-primary" />
      <span className="relative z-10 min-w-0 rounded px-1">
        <CurrencyName name={mode.sellCurrencyName} locale={locale} compact />
      </span>
    </div>
  );
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

function AllRoutesSummary({ t }: { t: UiText }) {
  return (
    <div className="route-thread grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-md border bg-muted/45 px-3 py-2">
      <span className="relative z-10 min-w-0 rounded px-1 font-medium">{t.allRoutes}</span>
      <ArrowDownUpIcon className="relative z-10 text-primary" />
      <span className="relative z-10 min-w-0 rounded px-1 text-muted-foreground">{t.bestRoutePerTarget}</span>
    </div>
  );
}

function getRoiBadgeVariant(roi: number): "default" | "secondary" | "destructive" {
  if (roi >= 5) {
    return "default";
  }
  if (roi >= 0) {
    return "secondary";
  }
  return "destructive";
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon
}: {
  label: string;
  value: string;
  hint: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <Card className="market-panel gap-3 overflow-hidden rounded-lg py-4">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription>{label}</CardDescription>
            <CardTitle className="mt-1 text-2xl text-primary">{value}</CardTitle>
          </div>
          {Icon ? (
            <span className="rounded-md border bg-background/45 p-2 text-primary">
              <Icon />
            </span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="px-4 text-sm text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}

function RoiBadge({ roi, locale }: { roi: number; locale: Locale }) {
  return <Badge variant={getRoiBadgeVariant(roi)}>{formatPercent(roi, locale)}</Badge>;
}

function FavoriteButton({
  active,
  onClick,
  t
}: {
  active: boolean;
  onClick: () => void;
  t: UiText;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={active ? t.removeFavorite : t.addFavorite}
          size="icon-sm"
          variant={active ? "default" : "outline"}
          onClick={onClick}
        >
          <StarIcon data-icon="inline-start" className={cn(active && "fill-current")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{active ? t.favorited : t.favorite}</TooltipContent>
    </Tooltip>
  );
}

function TradePlan({
  result,
  mode,
  locale,
  t
}: {
  result: TargetResult;
  mode: MarketRoute;
  locale: Locale;
  t: UiText;
}) {
  const integerRows = getIntegerRoiRows(result);
  const [plannerValues, setPlannerValues] = useState(() => getDefaultPlannerValues(result));
  const manualResult = getManualPlannerResult(plannerValues, result);
  const buyLots = getIntegerTradeRows(result.buyPrice);
  const sellLots = getIntegerTradeRows(result.sellPrice);
  const itemName = formatItemName(result.item, locale);
  const buyCurrencyName = formatItemName({ name: mode.buyCurrencyName }, locale);
  const sellCurrencyName = formatItemName({ name: mode.sellCurrencyName }, locale);
  const updatePlannerValue = (key: keyof typeof plannerValues, value: string) => {
    setPlannerValues((current) => ({ ...current, [key]: value }));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ListFilterIcon data-icon="inline-start" />
          {t.roundLots}
        </Button>
      </DialogTrigger>
      <DialogContent className="market-panel max-h-[min(92vh,820px)] gap-0 overflow-hidden bg-card p-0 text-card-foreground shadow-2xl sm:max-w-4xl">
        <DialogHeader className="border-b px-5 py-4 pr-12 sm:pr-5">
          <DialogTitle className="flex items-center gap-2">
            <PencilRulerIcon />
            {t.tradePlan}
          </DialogTitle>
          <DialogDescription>{t.tradePlanDescription}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(min(92vh,820px)-90px)]">
          <div className="flex flex-col gap-4 p-5 text-sm">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <div className="rounded-md border bg-muted/60 p-3">
                <RouteSummary mode={mode} locale={locale} />
                <div className="mt-3 flex min-w-0 items-start gap-3">
                  <ItemIcon item={result.item} className="size-10" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{itemName}</div>
                    <div className="mt-1 text-muted-foreground">
                      {formatMessage(t.paySellEach, {
                        buyPrice: formatNumber(result.buyPrice, MARKET_VALUE_DIGITS, locale),
                        buy: buyCurrencyName,
                        sellPrice: formatNumber(result.sellPrice, MARKET_VALUE_DIGITS, locale),
                        sell: sellCurrencyName
                      })}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-muted-foreground">
                  {formatMessage(t.conversionUsed, {
                    sell: sellCurrencyName,
                    rate: formatNumber(result.sellToBuyRate, MARKET_VALUE_DIGITS, locale),
                    buy: buyCurrencyName
                  })}
                </div>
                {result.roi < 0 && result.reverseRoi && result.reverseRoi > 0 ? (
                  <div className="mt-2 font-medium">
                    {formatMessage(t.reverseDirection, {
                      sell: sellCurrencyName,
                      buy: buyCurrencyName,
                      roi: formatPercent(result.reverseRoi, locale)
                    })}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 rounded-md border bg-background/45 p-3 sm:grid-cols-2">
                <div className="col-span-full text-xs font-medium uppercase text-muted-foreground">{t.currentSnapshot}</div>
                <div>
                  <div className="text-xs text-muted-foreground">{t.buyPrice}</div>
                  <div className="mt-1 flex items-center gap-2 font-medium">
                    <CurrencyMark name={mode.buyCurrencyName} className="size-7 text-[0.62rem]" />
                    {formatNumber(result.buyPrice, MARKET_VALUE_DIGITS, locale)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t.sellPrice}</div>
                  <div className="mt-1 flex items-center gap-2 font-medium">
                    <CurrencyMark name={mode.sellCurrencyName} className="size-7 text-[0.62rem]" />
                    {formatNumber(result.sellPrice, MARKET_VALUE_DIGITS, locale)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t.roi}</div>
                  <div className="mt-1">
                    <RoiBadge roi={result.roi} locale={locale} />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t.profit}</div>
                  <div className="mt-1 font-medium">
                    {formatNumber(result.netProfitInBuyCurrency, MARKET_VALUE_DIGITS, locale)} {buyCurrencyName}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t.goldCost}</div>
                  <div className="mt-1 flex items-center gap-1.5 font-medium">
                    <CoinsIcon className="size-4 text-primary" />
                    {formatNumber(result.totalGoldCost, 0, locale)} {t.gold}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t.stock}</div>
                  <div className="mt-1 font-medium">{formatNumber(result.stock, 0, locale)}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-md border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-medium">{t.buySideTrade}</div>
                  <Badge variant="secondary">{t.snapshot}</Badge>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{t.payAmount} ({buyCurrencyName})</span>
                    <Input
                      inputMode="decimal"
                      min="0"
                      type="number"
                      value={plannerValues.buyPayAmount}
                      onChange={(event) => updatePlannerValue("buyPayAmount", event.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{t.buyReceives}</span>
                    <Input
                      inputMode="decimal"
                      readOnly
                      type="number"
                      value={manualResult.buyItemCount === null ? "" : String(Number(manualResult.buyItemCount.toPrecision(12)))}
                    />
                  </label>
                </div>
                <div className="mt-3 text-muted-foreground">
                  {t.buySideCalculated}
                </div>
              </div>

              <div className="rounded-md border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-medium">{t.sellSideTrade}</div>
                  <Badge variant="secondary">{t.snapshot}</Badge>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{t.itemQuantity}</span>
                    <Input
                      inputMode="decimal"
                      min="0"
                      type="number"
                      value={plannerValues.sellItemCount}
                      onChange={(event) => updatePlannerValue("sellItemCount", event.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">{t.sellAmountCalculated} ({sellCurrencyName})</span>
                    <Input
                      inputMode="decimal"
                      readOnly
                      type="number"
                      value={manualResult.sellGetAmount === null ? "" : String(Number(manualResult.sellGetAmount.toPrecision(12)))}
                    />
                  </label>
                </div>
                <div className="mt-3 text-muted-foreground">
                  {t.sellSideCalculated}
                </div>
              </div>
            </div>

            <div className="rounded-md border bg-muted/45 p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{t.enteredTrade}</div>
                  <div className="mt-1 text-lg font-semibold text-primary">
                    {manualResult.roi === null ? "--" : formatPercent(manualResult.roi, locale)}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {formatMessage(t.roiDelta, {
                      delta: manualResult.roiDelta === null ? "--" : formatPercent(manualResult.roiDelta, locale)
                    })}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
                  <div>
                    <div className="text-xs text-muted-foreground">{t.sellGet}</div>
                    <div className="mt-1 font-medium">
                      {manualResult.batchSellGet === null
                        ? "--"
                        : formatNumber(manualResult.batchSellGet, MARKET_VALUE_DIGITS, locale)}{" "}
                      {sellCurrencyName}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{t.profit}</div>
                    <div className="mt-1 font-medium">
                      {manualResult.batchProfit === null
                        ? "--"
                        : formatNumber(manualResult.batchProfit, MARKET_VALUE_DIGITS, locale)}{" "}
                      {buyCurrencyName}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border">
              <div className="border-b px-3 py-2 font-medium">{t.roundLots}</div>
              {integerRows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.itemCount}</TableHead>
                      <TableHead>{t.buyPay}</TableHead>
                      <TableHead>{t.sellGet}</TableHead>
                      <TableHead>{t.roi}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integerRows.map((row) => (
                      <TableRow key={`${row.itemCount}-${row.buyCurrencyCount}-${row.sellCurrencyCount}`}>
                        <TableCell>{row.itemCount}</TableCell>
                        <TableCell>
                          {formatNumber(row.buyCurrencyCount, 0, locale)} {buyCurrencyName}
                        </TableCell>
                        <TableCell>
                          {formatNumber(row.sellCurrencyCount, 0, locale)} {sellCurrencyName}
                        </TableCell>
                        <TableCell>
                          <RoiBadge roi={row.roi} locale={locale} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-3 text-muted-foreground">
                  {formatMessage(t.noIntegerLot, { deviation: MAX_INTEGER_PRICE_DEVIATION_PERCENT })}
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <div className="font-medium">{t.closestBuyLots}</div>
                <div className="mt-2 flex flex-col gap-1 text-muted-foreground">
                  {buyLots.slice(0, 3).map((row) => (
                    <span key={`buy-${row.itemCount}-${row.currencyCount}`}>
                      {formatMessage(t.itemEquals, {
                        items: formatNumber(row.itemCount, 0, locale),
                        currency: formatNumber(row.currencyCount, 0, locale),
                        name: buyCurrencyName,
                        diff: formatPercent(row.diffPercent, locale)
                      })}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="font-medium">{t.closestSellLots}</div>
                <div className="mt-2 flex flex-col gap-1 text-muted-foreground">
                  {sellLots.slice(0, 3).map((row) => (
                    <span key={`sell-${row.itemCount}-${row.currencyCount}`}>
                      {formatMessage(t.itemEquals, {
                        items: formatNumber(row.itemCount, 0, locale),
                        currency: formatNumber(row.currencyCount, 0, locale),
                        name: sellCurrencyName,
                        diff: formatPercent(row.diffPercent, locale)
                      })}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {result.goldPerDivineProfit ? (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CoinsIcon className="size-4 text-primary" />
                {formatMessage(t.goldEfficiency, {
                  gold: formatNumber(result.goldPerDivineProfit, 2, locale)
                })}
              </div>
            ) : null}
          </div>
          <ScrollBar />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function OpportunityCard({
  result,
  mode,
  locale,
  t
}: {
  result: TargetResult;
  mode: MarketRoute;
  locale: Locale;
  t: UiText;
}) {
  const itemName = formatItemName(result.item, locale);
  const buyCurrencyName = formatItemName({ name: mode.buyCurrencyName }, locale);
  const sellCurrencyName = formatItemName({ name: mode.sellCurrencyName }, locale);

  return (
    <Card className="market-panel grid min-h-[280px] grid-rows-[1fr_auto_auto] gap-0 overflow-hidden rounded-lg py-0">
      <CardHeader className="pb-4 pt-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <CategoryBadge item={result.item} tag={result.target.tag || result.item.tag} locale={locale} />
            <div className="mt-3 flex min-h-[2.5rem] min-w-0 items-start gap-2">
              <ItemIcon item={result.item} />
              <CardTitle className="line-clamp-2 text-base leading-snug">{itemName}</CardTitle>
            </div>
            <CardDescription className="mt-1">
              {formatMessage(t.routeTo, { buy: buyCurrencyName, sell: sellCurrencyName })}
            </CardDescription>
          </div>
          <div className="shrink-0 justify-self-end">
            <RoiBadge roi={result.roi} locale={locale} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-4">
        <RouteSummary mode={mode} locale={locale} />
      </CardContent>
      <CardContent className="flex items-center justify-between gap-3 px-6 pb-6 text-sm">
        <span className="text-muted-foreground">
          {formatMessage(t.volumePrefix, { volume: formatNumber(result.volume, 0, locale) })}
        </span>
        <div className="flex items-center justify-between gap-3">
          <TradePlan result={result} mode={mode} locale={locale} t={t} />
        </div>
      </CardContent>
    </Card>
  );
}

export function MarketDashboard({ initialData, initialLocale, dataSource }: DashboardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [marketData, setMarketData] = useState(initialData);
  const [remoteManifest, setRemoteManifest] = useState<MarketDataManifest | null>(null);
  const [remoteStatus, setRemoteStatus] = useState<MarketDataStatus | null>(null);
  const [remoteError, setRemoteError] = useState("");
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [activeTab, setActiveTab] = useState("targets");
  const [selectedModeKey, setSelectedModeKey] = useState(ALL_ROUTE_KEY);
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedBestBuyItemId, setSelectedBestBuyItemId] = useState(() => initialData.state.targets[0]?.itemId || "");
  const [bestCurrencySide, setBestCurrencySide] = useState<BestCurrencySide>("buy");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("roi");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [marketFilters, setMarketFilters] = useState<MarketFilters>(() => normalizeFilters(undefined));
  const [favoriteItemIds, setFavoriteItemIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);

  const t = UI_TEXT[locale];
  const state = marketData.state;
  const trendsHref = `/${getLocaleRoute(locale)}/trends`;
  const switchLocale = (nextLocale: Locale) => {
    router.push(replaceLocaleInPath(pathname, nextLocale));
  };

  useEffect(() => {
    if (!dataSource.baseUrl) {
      return;
    }

    const abortController = new AbortController();

    async function loadRemoteMarketData() {
      try {
        const manifestUrl = resolveRemoteUrl(dataSource.baseUrl, dataSource.manifestPath);
        const statusUrl = resolveRemoteUrl(dataSource.baseUrl, dataSource.statusPath);
        const manifest = await fetchJson<MarketDataManifest>(manifestUrl);
        const snapshotUrl = resolveRemoteUrl(dataSource.baseUrl, manifest.snapshot.url);
        const [snapshot, status] = await Promise.all([
          fetchJson<MarketData>(snapshotUrl),
          fetchJson<MarketDataStatus>(statusUrl).catch(() => null)
        ]);

        if (abortController.signal.aborted) {
          return;
        }

        setRemoteManifest(manifest);
        setRemoteStatus(status);
        setMarketData(snapshot);
        setRemoteError("");
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setRemoteError(error instanceof Error ? error.message : "Failed to load remote market data");
      }
    }

    loadRemoteMarketData();

    return () => {
      abortController.abort();
    };
  }, [dataSource.baseUrl, dataSource.manifestPath, dataSource.statusPath]);

  const productionDataUnavailable = dataSource.requireRemote && remoteError;
  const tagIconItems = useMemo(() => {
    const icons = new Map<string, MarketItem>();
    for (const item of state.items) {
      const tag = item.tag || item.category;
      if (tag && item.tagIconUrl && !icons.has(tag)) {
        icons.set(tag, item);
      }
    }
    return icons;
  }, [state.items]);
  const dashboardModel = useMemo(
    () =>
      buildDashboardModel({
        state,
        selectedModeKey,
        selectedTag,
        selectedBestBuyItemId,
        bestCurrencySide,
        search,
        sortKey,
        favoritesOnly,
        favoriteItemIds,
        marketFilters,
        page,
        pageSize: PAGE_SIZE,
        allRouteKey: ALL_ROUTE_KEY,
        formatItemName: (item) => formatItemName(item, locale),
        formatTag: (tag) => formatTag(tag, locale)
      }),
    [
      bestCurrencySide,
      favoriteItemIds,
      favoritesOnly,
      locale,
      marketFilters,
      page,
      search,
      selectedBestBuyItemId,
      selectedModeKey,
      selectedTag,
      sortKey,
      state
    ]
  );
  const {
    currencyItems,
    currencyModes,
    selectedMode,
    isAllRoutes,
    tags,
    targetOptions,
    bestBuyItemId,
    bestBuyCandidates,
    routedResults,
    pagedResults,
    pageCount,
    normalizedPage,
    profitableCount,
    bestRoi,
    bestVolume,
    overviewResults
  } = dashboardModel;

  useEffect(() => {
    const saved = loadDashboardPreferences();

    if (!saved) {
      setHasLoadedPreferences(true);
      return;
    }

    if (saved.activeTab) {
      setActiveTab(saved.activeTab);
    }
    if (saved.selectedModeKey) {
      setSelectedModeKey(saved.selectedModeKey);
    }
    if (saved.selectedTag) {
      setSelectedTag(saved.selectedTag);
    }
    if (saved.selectedBestBuyItemId) {
      setSelectedBestBuyItemId(saved.selectedBestBuyItemId);
    }
    if (typeof saved.search === "string") {
      setSearch(saved.search);
    }
    if (saved.sortKey) {
      setSortKey(saved.sortKey);
    }
    if (saved.marketFilters) {
      setMarketFilters(normalizeFilters(saved.marketFilters));
    }
    if (typeof saved.favoritesOnly === "boolean") {
      setFavoritesOnly(saved.favoritesOnly);
    }
    if (Array.isArray(saved.favoriteItemIds)) {
      setFavoriteItemIds(saved.favoriteItemIds);
    }

    setHasLoadedPreferences(true);
  }, []);

  useEffect(() => {
    setLocale(initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    if (!hasLoadedPreferences) {
      return;
    }

    saveDashboardPreferences({
      activeTab,
      selectedModeKey,
      selectedTag,
      selectedBestBuyItemId,
      search,
      sortKey,
      marketFilters,
      favoritesOnly,
      favoriteItemIds
    });
  }, [
    activeTab,
    favoriteItemIds,
    favoritesOnly,
    hasLoadedPreferences,
    marketFilters,
    search,
    selectedBestBuyItemId,
    selectedModeKey,
    selectedTag,
    sortKey
  ]);

  useEffect(() => {
    if (selectedModeKey === ALL_ROUTE_KEY) {
      return;
    }
    if (selectedMode && selectedMode.key !== selectedModeKey) {
      setSelectedModeKey(selectedMode.key);
    }
  }, [selectedMode, selectedModeKey]);

  useEffect(() => {
    setDocumentLocale(locale);
  }, [locale]);

  useEffect(() => {
    setPage(1);
  }, [favoritesOnly, marketFilters, search, selectedModeKey, selectedTag, sortKey]);

  function updateMarketFilter(key: keyof MarketFilters, value: string) {
    setMarketFilters((current) => normalizeFilters({ ...current, [key]: value }));
  }

  function toggleFavorite(itemId: string) {
    setFavoriteItemIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]
    );
  }

  const isWaitingForRequiredRemoteData = dataSource.requireRemote && !remoteManifest && !remoteError;
  const snapshotLabel = isWaitingForRequiredRemoteData ? "Loading latest market data" : t.currentSnapshot;
  const leagueLabel = isWaitingForRequiredRemoteData ? "Loading" : marketData.league || t.localSnapshot;

  return (
    <TooltipProvider>
      <div className="market-shell min-h-screen">
        <header className="border-b bg-background/75 backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1.5">
                    <SparklesIcon />
                    POE2
                  </Badge>
                  <Badge variant="outline" className="bg-background/35">
                    {leagueLabel}
                  </Badge>
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-normal sm:text-3xl">
                  {t.marketArbitrageDesk}
                </h1>
                <p className="mt-2 flex max-w-3xl flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  {snapshotLabel}
                  {isWaitingForRequiredRemoteData ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <Badge variant="outline" className="bg-background/35">
                        Loading
                      </Badge>
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true">·</span>
                      <LocalSnapshotTime value={state.importedAt} locale={locale} t={t} />
                      <FreshnessBadge importedAt={state.importedAt} manifest={remoteManifest} status={remoteStatus} />
                    </>
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button asChild variant="outline">
                  <Link href={trendsHref}>
                    <BarChart3Icon />
                    {t.trends}
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
                {isWaitingForRequiredRemoteData ? null : (
                  <Badge variant="outline" className="justify-center bg-background/35 px-3 py-1.5">
                    {formatMessage(t.targetsIndexed, { count: formatNumber(state.targets.length, 0, locale) })}
                  </Badge>
                )}
              </div>
            </div>
            <LandingHelperToast t={t} />
            {productionDataUnavailable ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Market data could not be loaded. Please try refreshing the page.
              </div>
            ) : remoteError && !dataSource.requireRemote ? (
              <div className="rounded-md border bg-background/45 px-3 py-2 text-sm text-muted-foreground">
                Using the saved market data while the latest data is unavailable.
              </div>
            ) : null}
            {isWaitingForRequiredRemoteData ? (
              <div className="rounded-md border bg-background/45 px-3 py-3 text-sm text-muted-foreground">
                Loading the latest market data.
              </div>
            ) : null}
            {isWaitingForRequiredRemoteData ? null : (
              <>
                {isAllRoutes ? <AllRoutesSummary t={t} /> : selectedMode ? <RouteSummary mode={selectedMode} locale={locale} /> : null}
                <SnapshotUpdatePrompt importedAt={state.importedAt} t={t} />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    label={t.bestRoi}
                    value={formatPercent(bestRoi, locale)}
                    hint={formatMessage(t.profitableRows, { count: formatNumber(profitableCount, 0, locale) })}
                    icon={SparklesIcon}
                  />
                  <StatCard
                    label={t.targets}
                    value={formatNumber(routedResults.length, 0, locale)}
                    hint={t.afterFilters}
                    icon={GemIcon}
                  />
                  <StatCard
                    label={t.peakVolume}
                    value={formatNumber(bestVolume, 0, locale)}
                    hint={t.volumeTradedEstimate}
                    icon={CoinsIcon}
                  />
                  <StatCard
                    label={t.favorites}
                    value={formatNumber(favoriteItemIds.length, 0, locale)}
                    hint={t.storedLocally}
                    icon={StarIcon}
                  />
                </div>
              </>
            )}
          </div>
        </header>

        {isWaitingForRequiredRemoteData ? null : (
          <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          {overviewResults.length ? (
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {overviewResults.map(({ result, mode }) => (
                <OpportunityCard
                  key={`${result.target.id}-${mode.key}`}
                  result={result}
                  mode={mode}
                  locale={locale}
                  t={t}
                />
              ))}
            </section>
          ) : null}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-4">
            <div className="market-rail flex flex-col gap-3 rounded-lg border p-3 lg:flex-row lg:items-center lg:justify-between">
              <TabsList className="grid w-full grid-cols-3 lg:w-fit">
                <TabsTrigger value="targets">
                  <SparklesIcon />
                  {t.targets}
                </TabsTrigger>
                <TabsTrigger value="pairs">
                  <ArrowDownUpIcon />
                  {t.pairs}
                </TabsTrigger>
                <TabsTrigger value="items">
                  <GemIcon />
                  {t.items}
                </TabsTrigger>
              </TabsList>
              <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-center">
                <Select value={selectedModeKey} onValueChange={setSelectedModeKey}>
                  <SelectTrigger className="w-full lg:w-[300px]">
                    <SelectValue placeholder={t.route} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>{t.route}</SelectLabel>
                      <SelectItem value={ALL_ROUTE_KEY}>
                        <SparklesIcon />
                        {t.allRoutes}
                      </SelectItem>
                      {currencyModes.map((mode) => (
                        <SelectItem key={mode.key} value={mode.key}>
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <CurrencyMark name={mode.buyCurrencyName} className="size-5 text-[0.54rem]" />
                            <span className="truncate">
                              {formatMessage(t.routeTo, {
                                buy: formatItemName({ name: mode.buyCurrencyName }, locale),
                                sell: formatItemName({ name: mode.sellCurrencyName }, locale)
                              })}
                            </span>
                            <CurrencyMark name={mode.sellCurrencyName} className="size-5 text-[0.54rem]" />
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Select value={selectedTag} onValueChange={setSelectedTag}>
                  <SelectTrigger className="w-full lg:w-[220px]">
                    <SelectValue placeholder={t.category} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>{t.category}</SelectLabel>
                      <SelectItem value="all">
                        <FilterIcon />
                        {t.allCategories}
                      </SelectItem>
                      {tags.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tagIconItems.get(tag) ? <CategoryIcon item={tagIconItems.get(tag)!} /> : <GemIcon />}
                          {formatTag(tag, locale)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="targets" className="mt-0 flex flex-col gap-4">
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMarketFilters(normalizeFilters(undefined));
                        setSearch("");
                        setSelectedTag("all");
                        setFavoritesOnly(false);
                      }}
                    >
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
                      ["minRoiPercent", "ROI >=", "%"],
                      ["maxRoiPercent", "ROI <=", "%"]
                    ].map(([key, label, unit]) => (
                      <label key={key} className="flex flex-col gap-1.5">
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

              <Card className="market-panel rounded-lg">
                <CardHeader>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <RouteIcon />
                        {t.arbitrageTargets}
                      </CardTitle>
                      <CardDescription>
                        {isAllRoutes
                          ? t.allRoutesHint
                          : selectedMode
                            ? formatMessage(t.buySideSellSide, {
                              buy: formatItemName({ name: selectedMode.buyCurrencyName }, locale),
                              sell: formatItemName({ name: selectedMode.sellCurrencyName }, locale)
                            })
                            : t.selectRoute}
                      </CardDescription>
                    </div>
                    <CardAction className="static row-auto col-auto self-auto justify-self-auto">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Switch
                          id="favorites-only"
                          checked={favoritesOnly}
                          onCheckedChange={setFavoritesOnly}
                        />
                        <label htmlFor="favorites-only">{t.favorites}</label>
                      </div>
                    </CardAction>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid gap-2 lg:grid-cols-[1fr_180px]">
                    <div className="relative">
                      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder={t.searchTargets}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    </div>
                    <Select value={sortKey} onValueChange={setSortKey}>
                      <SelectTrigger className="w-full">
                        <ListFilterIcon />
                        <SelectValue placeholder={t.sort} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>{t.sortBy}</SelectLabel>
                          <SelectItem value="roi">ROI</SelectItem>
                          <SelectItem value="volume">{t.volume}</SelectItem>
                          <SelectItem value="stock">{t.stock}</SelectItem>
                          <SelectItem value="gold">{t.goldCost}</SelectItem>
                          <SelectItem value="buy">{t.buyPrice}</SelectItem>
                          <SelectItem value="sell">{t.sellPrice}</SelectItem>
                          <SelectItem value="profit">{t.profit}</SelectItem>
                          <SelectItem value="name">{t.name}</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-md border bg-muted/35 p-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-medium">
                          <CoinsIcon className="text-primary" />
                          {bestCurrencySide === "sell" ? t.bestSellCurrency : t.bestBuyCurrency}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {bestCurrencySide === "sell" ? t.bestSellCurrencyHint : t.bestBuyCurrencyHint}
                        </div>
                      </div>
                      <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end lg:w-auto">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 justify-center"
                          onClick={() => setBestCurrencySide((side) => (side === "buy" ? "sell" : "buy"))}
                        >
                          <ArrowDownUpIcon />
                          {bestCurrencySide === "buy" ? t.showSellCurrency : t.showBuyCurrency}
                        </Button>
                        <SearchableTargetSelect
                          options={targetOptions}
                          value={bestBuyItemId}
                          onValueChange={setSelectedBestBuyItemId}
                          locale={locale}
                          t={t}
                        />
                      </div>
                    </div>

                    {bestBuyCandidates.length ? (
                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        {bestBuyCandidates.map((candidate) => (
                          <div
                            key={candidate.currencyId}
                            className={cn(
                              "rounded-md border bg-background/45 p-3 text-sm",
                              candidate.isBest && "border-primary bg-primary/10"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <CurrencyName name={candidate.currencyName} locale={locale} compact />
                              {candidate.isBest ? <Badge>{t.best}</Badge> : null}
                            </div>
                            <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                              <div className="flex items-center justify-between gap-2">
                                <span>{t.originalPrice}</span>
                                <span className="font-medium text-foreground">
                                  {formatNumber(candidate.price, MARKET_VALUE_DIGITS, locale)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span>{bestCurrencySide === "sell" ? t.normalizedValue : t.normalizedCost}</span>
                                <span className="font-medium text-foreground">
                                  {candidate.normalizedAmount === null
                                    ? t.missingConversion
                                    : formatNumber(candidate.normalizedAmount, MARKET_VALUE_DIGITS, locale)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="hidden rounded-md border md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[52px]"></TableHead>
                          <TableHead>{t.target}</TableHead>
                          <TableHead>{t.buy}</TableHead>
                          <TableHead>{t.sell}</TableHead>
                          <TableHead>ROI</TableHead>
                          <TableHead>{t.profit}</TableHead>
                          <TableHead>{t.volume}</TableHead>
                          <TableHead>{t.stock}</TableHead>
                          <TableHead>{t.gold}</TableHead>
                          <TableHead>{t.plan}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedResults.map(({ result, mode }) => (
                          <TableRow key={`${result.target.id}-${mode.key}`}>
                            <TableCell>
                              <FavoriteButton
                                active={favoriteItemIds.includes(result.item.id)}
                                onClick={() => toggleFavorite(result.item.id)}
                                t={t}
                              />
                            </TableCell>
                            <TableCell className="max-w-[280px]">
                              <div className="flex min-w-0 items-center gap-2">
                                <ItemIcon item={result.item} className="size-7" />
                                <div className="min-w-0 truncate font-medium">{formatItemName(result.item, locale)}</div>
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {formatTag(result.target.tag, locale)}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {formatMessage(t.buyWithSellFor, {
                                  buy: formatItemName({ name: mode.buyCurrencyName }, locale),
                                  sell: formatItemName({ name: mode.sellCurrencyName }, locale)
                                })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <CurrencyMark name={mode.buyCurrencyName} className="size-7 text-[0.62rem]" />
                                <span>{formatNumber(result.buyPrice, MARKET_VALUE_DIGITS, locale)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <CurrencyMark name={mode.sellCurrencyName} className="size-7 text-[0.62rem]" />
                                <span>{formatNumber(result.sellPrice, MARKET_VALUE_DIGITS, locale)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <RoiBadge roi={result.roi} locale={locale} />
                            </TableCell>
                            <TableCell>
                              {`${formatNumber(result.netProfitInBuyCurrency, MARKET_VALUE_DIGITS, locale)} ${formatItemName(
                                { name: mode.buyCurrencyName },
                                locale
                              )}`}
                            </TableCell>
                            <TableCell>{formatNumber(result.volume, 0, locale)}</TableCell>
                            <TableCell>{formatNumber(result.stock, 0, locale)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <CoinsIcon className="size-4 text-primary" />
                                {formatNumber(result.totalGoldCost, 0, locale)}
                              </div>
                              {result.goldPerDivineProfit ? (
                                <div className="text-xs text-muted-foreground">
                                  {formatNumber(result.goldPerDivineProfit, 1, locale)}/
                                  {formatItemName({ name: "Divine Orb" }, locale)}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <TradePlan result={result} mode={mode} locale={locale} t={t} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid gap-3 md:hidden">
                    {pagedResults.map(({ result, mode }) => (
                      <Card key={`${result.target.id}-${mode.key}`} className="market-panel rounded-lg">
                        <CardHeader>
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                            <div className="min-w-0">
                              <CardTitle className="flex min-w-0 items-center gap-2 text-base">
                                <ItemIcon item={result.item} className="size-7" />
                                <span className="truncate">{formatItemName(result.item, locale)}</span>
                              </CardTitle>
                              <CardDescription>
                                {formatMessage(t.routeTo, {
                                  buy: formatItemName({ name: mode.buyCurrencyName }, locale),
                                  sell: formatItemName({ name: mode.sellCurrencyName }, locale)
                                })}
                              </CardDescription>
                            </div>
                            <FavoriteButton
                              active={favoriteItemIds.includes(result.item.id)}
                              onClick={() => toggleFavorite(result.item.id)}
                              t={t}
                            />
                          </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-muted-foreground">{t.buy}</div>
                            <div className="mt-1 flex items-center gap-2 font-medium">
                              <CurrencyMark name={mode.buyCurrencyName} className="size-7 text-[0.62rem]" />
                              {formatNumber(result.buyPrice, MARKET_VALUE_DIGITS, locale)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">{t.sell}</div>
                            <div className="mt-1 flex items-center gap-2 font-medium">
                              <CurrencyMark name={mode.sellCurrencyName} className="size-7 text-[0.62rem]" />
                              {formatNumber(result.sellPrice, MARKET_VALUE_DIGITS, locale)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">ROI</div>
                            <RoiBadge roi={result.roi} locale={locale} />
                          </div>
                          <div>
                            <div className="text-muted-foreground">{t.volume}</div>
                            <div className="font-medium">{formatNumber(result.volume, 0, locale)}</div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-muted-foreground">{t.plan}</div>
                            <div className="mt-1">
                              <TradePlan result={result} mode={mode} locale={locale} t={t} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                      {formatMessage(t.pageRows, {
                        page: formatNumber(normalizedPage, 0, locale),
                        pageCount: formatNumber(pageCount, 0, locale),
                        rows: formatNumber(routedResults.length, 0, locale)
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={normalizedPage <= 1}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                      >
                        <ChevronLeftIcon data-icon="inline-start" />
                        {t.previous}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={normalizedPage >= pageCount}
                        onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                      >
                        {t.next}
                        <ChevronRightIcon data-icon="inline-end" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pairs" className="mt-0">
              <Card className="market-panel rounded-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowDownUpIcon />
                    {t.basePairs}
                  </CardTitle>
                  <CardDescription>{t.basePairsHint}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.base}</TableHead>
                          <TableHead>{t.quote}</TableHead>
                          <TableHead>{t.rate}</TableHead>
                          <TableHead>{t.reverse}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {state.pairs.map((pair) => {
                          const base = state.items.find((item) => item.id === pair.baseItemId);
                          const quote = state.items.find((item) => item.id === pair.quoteItemId);
                          const rate = asNumber(pair.rate);

                          return (
                            <TableRow key={pair.id}>
                              <TableCell className="font-medium">
                                {base ? <CurrencyName name={base.name} locale={locale} compact /> : pair.baseItemId}
                              </TableCell>
                              <TableCell>
                                {quote ? <CurrencyName name={quote.name} locale={locale} compact /> : pair.quoteItemId}
                              </TableCell>
                              <TableCell>{formatNumber(rate, MARKET_VALUE_DIGITS, locale)}</TableCell>
                              <TableCell>{formatNumber(rate ? 1 / rate : 0, 8, locale)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="items" className="mt-0">
              <Card className="market-panel rounded-lg">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <GemIcon />
                        {t.currencyAndTargets}
                      </CardTitle>
                      <CardDescription>{t.currencyAndTargetsHint}</CardDescription>
                    </div>
                    <SlidersHorizontalIcon className="text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="w-full">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t.name}</TableHead>
                            <TableHead>{t.type}</TableHead>
                            <TableHead>{t.volume}</TableHead>
                            <TableHead>{t.change}</TableHead>
                            <TableHead>{t.gold}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...currencyItems, ...state.items.filter((item) => item.category !== "currency").slice(0, 80)].map(
                            (item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                  {item.category === "currency" ? (
                                    <CurrencyName name={item.name} locale={locale} compact />
                                  ) : (
                                    <span className="flex min-w-0 items-center gap-2">
                                      <ItemIcon item={item} className="size-7" />
                                      <span className="truncate">{formatItemName(item, locale)}</span>
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <CategoryBadge item={item} tag={item.tag || item.category} locale={locale} />
                                </TableCell>
                                <TableCell>{item.volume || "--"}</TableCell>
                                <TableCell>{item.change || "--"}</TableCell>
                                <TableCell>{formatNumber(asNumber(item.goldCost), 0, locale)}</TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Separator />
          <footer className="flex flex-col gap-2 pb-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              {t.currentSnapshot} ·{" "}
              <LocalSnapshotTime value={state.importedAt} locale={locale} t={t} />
            </span>
            <span className="flex items-center gap-2">
              <BarChart3Icon />
              <span>{formatMessage(t.targetsIndexed, { count: formatNumber(state.targets.length, 0, locale) })}</span>
              <ArrowDownUpIcon />
              <span>{formatNumber(state.pairs.length, 0, locale)} {t.pairs}</span>
            </span>
          </footer>
          </main>
        )}
      </div>
    </TooltipProvider>
  );
}
