"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  ExternalLinkIcon,
  FilterIcon,
  RouteIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  TrendingUpIcon
} from "lucide-react";

import { CurrencyMark, ItemIcon } from "@/components/market-display";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import type { Locale } from "@/lib/locale";
import {
  formatItemName,
  formatMessage,
  formatNumber,
  formatPercent,
  type UiText
} from "@/lib/market-locale";

const SOURCE_URL = "https://github.com/Ifan24/poe2-market-arbitrage-desk";

const EXAMPLE_ITEM = {
  name: "Perfect Jeweller's Orb",
  iconUrl: "/item-icons/currency-perfect-jeweller-s-orb.webp"
};

export function MarketGuideDialog({
  t,
  locale,
  open,
  onOpenChange
}: {
  t: UiText;
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const itemName = formatItemName(EXAMPLE_ITEM, locale);
  const exaltedName = formatItemName({ name: "Exalted Orb" }, locale);
  const divineName = formatItemName({ name: "Divine Orb" }, locale);

  // Invariant trading numbers:
  // 1 Divine = 148 Exalted; buy 6 Perfect Jeweller's Orbs for 120 Exalted; sell 6 for 1 Divine; profit +28 Exalted; ROI +23.3%.
  const buyQuantity = 6;
  const buyCostExalted = 120;
  const sellReceiveDivine = 1;
  const rateDivineToExalted = 148;
  const grossProfitExalted = 28;
  const roiPercent = 23.3;

  const formattedBuyCost = formatNumber(buyCostExalted, 0, locale);
  const formattedBuyQty = formatNumber(buyQuantity, 0, locale);
  const formattedSellReceive = formatNumber(sellReceiveDivine, 0, locale);
  const formattedRate = formatNumber(rateDivineToExalted, 0, locale);
  const formattedProfit = `+${formatNumber(grossProfitExalted, 0, locale)}`;
  const formattedRoi = formatPercent(roiPercent, locale);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t.close}
        className="market-panel max-h-[min(92vh,840px)] w-full overflow-y-auto bg-card p-4 text-card-foreground sm:max-w-2xl sm:p-6 lg:max-w-3xl"
      >
        {/* Dialog header: Title with right padding to prevent collision with close button */}
        <DialogHeader className="gap-2 border-b border-border/55 pb-4">
          <div className="flex items-center gap-3 pr-8 sm:pr-10">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/35 bg-primary/10 text-primary shadow-[inset_0_1px_0_oklch(1_0_0/15%)] sm:size-10"
              aria-hidden="true"
            >
              <RouteIcon className="size-4.5 sm:size-5" aria-hidden="true" />
            </span>
            <DialogTitle className="text-left text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {t.landingGuideTitle}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {t.landingHelperDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* Main Visual: Visually dominant Worked Example Hero Card */}
          <section
            aria-labelledby="worked-example-heading"
            className="relative rounded-xl border border-primary/40 bg-gradient-to-b from-primary/[0.08] via-card to-card p-3.5 shadow-[0_0_24px_oklch(0.76_0.145_75/8%)] sm:p-5"
          >
            {/* Worked example badge & route pair banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  id="worked-example-heading"
                  className="inline-flex items-center gap-1.5 rounded-md border border-primary/45 bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"
                >
                  <SparklesIcon className="size-3.5" aria-hidden="true" />
                  {t.landingGuideExample}
                </span>
                <span className="text-xs font-medium text-foreground/90">
                  {formatMessage(t.buyWithSellFor, { buy: exaltedName, sell: divineName })}
                </span>
              </div>
              <span className="rounded border border-border/70 bg-muted/40 px-2 py-0.5 text-[0.6875rem] text-muted-foreground">
                1 {divineName} = {formattedRate} {exaltedName}
              </span>
            </div>

            {/* Visual Two-Sided Route Flow: 120 Exalted -> 6 Items -> 1 Divine */}
            <div className="mt-3.5 grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1.1fr_auto_1fr]">
              {/* Buy Side: 120 Exalted */}
              <div className="flex flex-col items-center rounded-lg border border-border/75 bg-background/60 p-2.5 text-center sm:p-3">
                <span className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                  {t.buyPay}
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  <CurrencyMark name="Exalted Orb" className="size-5.5 text-[0.6rem]" />
                  <span className="font-mono text-base font-bold text-foreground sm:text-lg">
                    {formattedBuyCost}
                  </span>
                </div>
                <span className="mt-0.5 truncate text-[0.6875rem] text-muted-foreground sm:text-xs">
                  {exaltedName}
                </span>
              </div>

              {/* Directional Connector 1 */}
              <div className="flex justify-center text-primary/70" aria-hidden="true">
                <ArrowRightIcon className="size-4 rotate-90 sm:rotate-0" />
              </div>

              {/* Target Item: 6 Perfect Jeweller's Orbs */}
              <div className="flex flex-col items-center rounded-lg border border-primary/45 bg-primary/[0.07] p-2.5 text-center shadow-[0_0_12px_oklch(0.76_0.145_75/10%)] sm:p-3">
                <span className="text-[0.6875rem] font-medium uppercase tracking-wider text-primary">
                  {t.itemQuantity}
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  <ItemIcon item={EXAMPLE_ITEM} className="size-5.5 rounded" />
                  <span className="font-mono text-base font-bold text-foreground sm:text-lg">
                    {formattedBuyQty}×
                  </span>
                </div>
                <span className="mt-0.5 truncate text-[0.6875rem] font-medium text-foreground sm:text-xs">
                  {itemName}
                </span>
              </div>

              {/* Directional Connector 2 */}
              <div className="flex justify-center text-primary/70" aria-hidden="true">
                <ArrowRightIcon className="size-4 rotate-90 sm:rotate-0" />
              </div>

              {/* Sell Side: 1 Divine */}
              <div className="flex flex-col items-center rounded-lg border border-border/75 bg-background/60 p-2.5 text-center sm:p-3">
                <span className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
                  {t.sellGet}
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  <CurrencyMark name="Divine Orb" className="size-5.5 text-[0.6rem]" />
                  <span className="font-mono text-base font-bold text-foreground sm:text-lg">
                    {formattedSellReceive}
                  </span>
                </div>
                <span className="mt-0.5 truncate text-[0.6875rem] text-muted-foreground sm:text-xs">
                  {divineName}
                </span>
              </div>
            </div>

            {/* Invariant Result Bar: Conversion + Gross Profit + ROI */}
            <div className="mt-3.5 flex flex-col gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-2.5 sm:flex-row sm:items-center sm:justify-between sm:p-3">
              <div className="flex items-center gap-2 text-xs text-emerald-300">
                <TrendingUpIcon className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
                <span className="truncate">
                  {formatMessage(t.conversionUsed, {
                    sell: divineName,
                    rate: formattedRate,
                    buy: exaltedName
                  })}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground">{t.profit}:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {formattedProfit} {exaltedName}
                  </span>
                </div>
                <div className="flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 text-xs font-bold text-emerald-300">
                  <span>{t.currentRoi}:</span>
                  <span className="font-mono">{formattedRoi}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Four-Stage Journey with Concrete UI Artifacts */}
          <ol className="flex flex-col gap-3.5" role="list">
            {/* Stage 01: Scan with Sample Opportunity Summary */}
            <li className="rounded-lg border border-primary/35 bg-primary/[0.03] p-3 transition-colors sm:p-4">
              <div className="flex items-center gap-2">
                <span
                  className="rounded border border-primary/40 bg-primary/15 px-1.5 py-0.5 font-mono text-[0.6875rem] font-bold text-primary"
                  aria-hidden="true"
                >
                  01
                </span>
                <p className="text-xs font-medium text-foreground sm:text-sm">
                  {t.landingGuideScan}
                </p>
              </div>

              {/* Concrete UI Artifact 01: Sample Scanner Opportunity Card */}
              <div className="mt-2.5 rounded-md border border-border/70 bg-card p-2.5 sm:p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <ItemIcon item={EXAMPLE_ITEM} className="size-6 shrink-0 rounded" />
                    <span className="truncate text-xs font-semibold text-foreground sm:text-sm">
                      {itemName}
                    </span>
                  </div>
                  <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.6875rem] font-medium text-primary">
                    {exaltedName} → {divineName}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded border border-border/50 bg-background/50 p-1.5 text-center">
                    <span className="text-[0.625rem] text-muted-foreground">{t.currentRoi}</span>
                    <p className="font-mono text-xs font-bold text-emerald-400 sm:text-sm">
                      {formattedRoi}
                    </p>
                  </div>
                  <div className="rounded border border-border/50 bg-background/50 p-1.5 text-center">
                    <span className="text-[0.625rem] text-muted-foreground">{t.stock}</span>
                    <p className="font-mono text-xs font-bold text-foreground sm:text-sm">12</p>
                  </div>
                  <div className="rounded border border-border/50 bg-background/50 p-1.5 text-center">
                    <span className="text-[0.625rem] text-muted-foreground">{t.liquidity}</span>
                    <p className="font-mono text-xs font-bold text-primary sm:text-sm">{formatNumber(8420, 0, locale)}</p>
                  </div>
                  <div className="rounded border border-border/50 bg-background/50 p-1.5 text-center">
                    <span className="text-[0.625rem] text-muted-foreground">{t.confidence}</span>
                    <p className="font-mono text-xs font-bold text-foreground sm:text-sm">98%</p>
                  </div>
                </div>
              </div>
            </li>

            {/* Stage 02: Filter with Sample Filter Thresholds */}
            <li className="rounded-lg border border-border/80 bg-muted/20 p-3 transition-colors sm:p-4">
              <div className="flex items-center gap-2">
                <span
                  className="rounded border border-border bg-background/80 px-1.5 py-0.5 font-mono text-[0.6875rem] font-bold text-muted-foreground"
                  aria-hidden="true"
                >
                  02
                </span>
                <p className="text-xs font-medium text-foreground sm:text-sm">
                  {t.landingGuideFilter}
                </p>
              </div>

              {/* Concrete UI Artifact 02: Sample Scanner Filter Bar Mockup */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-card p-2.5 sm:p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FilterIcon className="size-3.5 text-primary" aria-hidden="true" />
                  <span className="font-medium text-foreground">{t.marketFilters}:</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary">
                  <span>{t.roiMin}</span>
                  <span className="font-bold">15%</span>
                  <span className="text-[0.625rem] text-emerald-400">✓ ({formattedRoi})</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-mono text-primary">
                  <span>{t.stockFilter}</span>
                  <span className="font-bold">6</span>
                  <span className="text-[0.625rem] text-emerald-400">✓ (12)</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-0.5 text-xs font-mono text-muted-foreground">
                  <SlidersHorizontalIcon className="size-3" aria-hidden="true" />
                  <span>{t.liquidity} ≥ {formatNumber(5000, 0, locale)}</span>
                </span>
              </div>
            </li>

            {/* Stage 03: Plan with Round-Lot Execution Breakdown */}
            <li className="rounded-lg border border-primary/30 bg-primary/[0.03] p-3 transition-colors sm:p-4">
              <div className="flex items-center gap-2">
                <span
                  className="rounded border border-primary/35 bg-primary/10 px-1.5 py-0.5 font-mono text-[0.6875rem] font-bold text-primary/90"
                  aria-hidden="true"
                >
                  03
                </span>
                <p className="text-xs font-medium text-foreground sm:text-sm">
                  {t.landingGuidePlan}
                </p>
              </div>

              {/* Concrete UI Artifact 03: Executable Integer Round Lots Row */}
              <div className="mt-2.5 overflow-hidden rounded-md border border-border/70 bg-card">
                <div className="grid grid-cols-1 divide-y divide-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  {/* Buy Lot side */}
                  <div className="p-2.5 sm:p-3">
                    <span className="text-[0.6875rem] font-semibold text-muted-foreground">
                      1. {t.buy}
                    </span>
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <CurrencyMark name="Exalted Orb" className="size-4.5 text-[0.55rem]" />
                        <span className="font-mono font-semibold">{formattedBuyCost}</span>
                        <span className="text-muted-foreground">{exaltedName}</span>
                      </div>
                      <ArrowRightIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      <div className="flex items-center gap-1.5">
                        <ItemIcon item={EXAMPLE_ITEM} className="size-4.5 rounded" />
                        <span className="font-mono font-semibold">{formattedBuyQty}×</span>
                      </div>
                    </div>
                  </div>

                  {/* Sell Lot side */}
                  <div className="p-2.5 sm:p-3">
                    <span className="text-[0.6875rem] font-semibold text-muted-foreground">
                      2. {t.sell}
                    </span>
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <ItemIcon item={EXAMPLE_ITEM} className="size-4.5 rounded" />
                        <span className="font-mono font-semibold">{formattedBuyQty}×</span>
                      </div>
                      <ArrowRightIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      <div className="flex items-center gap-1.5">
                        <CurrencyMark name="Divine Orb" className="size-4.5 text-[0.55rem]" />
                        <span className="font-mono font-semibold">{formattedSellReceive}</span>
                        <span className="text-muted-foreground">{divineName}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/60 bg-muted/25 px-3 py-1.5 text-[0.6875rem] text-muted-foreground">
                  <span className="font-semibold text-foreground">{t.closestBuyLots} / {t.closestSellLots}:</span>{" "}
                  {formattedBuyCost} : {formattedBuyQty} & {formattedBuyQty} : {formattedSellReceive} ({t.snapshot})
                </div>
              </div>
            </li>

            {/* Stage 04: Verify with In-Game Checklist */}
            <li className="rounded-lg border border-emerald-500/35 bg-emerald-500/[0.04] p-3 transition-colors sm:p-4">
              <div className="flex items-center gap-2">
                <span
                  className="rounded border border-emerald-500/40 bg-emerald-500/12 px-1.5 py-0.5 font-mono text-[0.6875rem] font-bold text-emerald-300"
                  aria-hidden="true"
                >
                  04
                </span>
                <p className="text-xs font-medium text-foreground sm:text-sm">
                  {t.landingGuideVerify}
                </p>
              </div>

              {/* Concrete UI Artifact 04: Live Verification Checklist */}
              <div className="mt-2.5 rounded-md border border-emerald-500/30 bg-card p-2.5 sm:p-3">
                <ul className="space-y-1.5 text-xs text-foreground/90" role="list">
                  <li className="flex items-start gap-2">
                    <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                    <span>
                      {t.buy}: {formattedBuyQty}× {itemName} ≤ {formattedBuyCost} {exaltedName}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                    <span>
                      {t.sell}: {formattedBuyQty}× {itemName} ≥ {formattedSellReceive} {divineName}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                    <span>
                      {formatMessage(t.conversionUsed, { sell: divineName, rate: formattedRate, buy: exaltedName })}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                    <span>
                      {t.goldCost}: ≤ {formatNumber(600, 0, locale)} {t.gold}
                    </span>
                  </li>
                </ul>
              </div>
            </li>
          </ol>

          {/* Data Freshness Warning */}
          <div className="flex items-start gap-2.5 rounded-lg border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3 sm:gap-3 sm:p-3.5">
            <span
              className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border border-primary/35 bg-primary/15 text-primary sm:size-7"
              aria-hidden="true"
            >
              <ClockIcon className="size-3.5 sm:size-4" aria-hidden="true" />
            </span>
            <p className="text-xs leading-relaxed text-foreground/90 sm:text-sm">
              {t.landingGuideFreshness}
            </p>
          </div>

          {/* Subordinate Disclaimer and GitHub Repository Link */}
          <div className="flex flex-col gap-3 border-t border-border/50 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[0.75rem] leading-5 text-muted-foreground/85 sm:max-w-[65%]">
              {t.landingGuideDisclaimer}
            </p>
            <Button asChild size="sm" variant="outline" className="shrink-0 text-xs">
              <a href={SOURCE_URL} target="_blank" rel="noreferrer">
                <ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />
                {t.landingGuideSource}
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
