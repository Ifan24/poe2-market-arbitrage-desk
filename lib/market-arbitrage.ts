import type { MarketItem, MarketPair, MarketState, MarketTarget } from "./market-data";

export type MarketRoute = {
  key: string;
  buyCurrencyId: string;
  sellCurrencyId: string;
  buyCurrencyName: string;
  sellCurrencyName: string;
};

export type TargetResult = {
  target: MarketTarget;
  item: MarketItem;
  buyPrice: number;
  sellPrice: number;
  revenue: number;
  roi: number;
  netProfitInBuyCurrency: number;
  netProfitInSellCurrency: number;
  sellToBuyRate: number;
  buyPriceExalted: number;
  sellPriceExalted: number;
  volume: number;
  stock: number;
  goldCost: number;
  totalGoldCost: number;
  netProfitInDivine: number | null;
  goldPerDivineProfit: number | null;
  reverseRoi: number | null;
};

export const MAX_INTEGER_TRADE_ITEMS = 60;
export const MAX_INTEGER_PRICE_DEVIATION_PERCENT = 8;

export const DEFAULT_MARKET_FILTERS = {
  minTradeValueDivine: "50",
  minStock: "200",
  minPriceExalted: "20",
  maxPriceExalted: "1000",
  minRoiPercent: "2",
  maxRoiPercent: "200"
};

export type MarketFilters = typeof DEFAULT_MARKET_FILTERS;

export type ResultFilterOptions = {
  query: string;
  favoriteSet: Set<string>;
  selectedTag: string;
  favoritesOnly: boolean;
  marketFilters: MarketFilters;
  pairs: MarketPair[];
  formatItemName: (item: Pick<MarketItem, "name">) => string;
  formatTag: (tag: string | undefined) => string;
};

export type PlannerValues = {
  buyPayAmount: string;
  sellItemCount: string;
};

export type BuyCurrencyCandidate = {
  currencyId: string;
  currencyName: string;
  price: number;
  normalizedCost: number | null;
  normalizedAmount: number | null;
  normalizeCurrencyId: string;
  normalizeCurrencyName: string;
  conversionRate: number | null;
  missingConversion: boolean;
  isBest: boolean;
};

export type BestCurrencySide = "buy" | "sell";

export function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function asPositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseCompactVolume(value?: string) {
  const text = String(value || "").trim().toLowerCase();
  if (!text || text === "--") {
    return 0;
  }

  const multiplier = text.endsWith("k") ? 1000 : 1;
  const parsed = Number(text.replace(/k$/, ""));
  return Number.isFinite(parsed) ? parsed * multiplier : 0;
}

export function normalizeFilters(filters: Partial<Record<keyof MarketFilters, string>> | undefined): MarketFilters {
  return {
    minTradeValueDivine: filters?.minTradeValueDivine || DEFAULT_MARKET_FILTERS.minTradeValueDivine,
    minStock: filters?.minStock || DEFAULT_MARKET_FILTERS.minStock,
    minPriceExalted: filters?.minPriceExalted || DEFAULT_MARKET_FILTERS.minPriceExalted,
    maxPriceExalted: filters?.maxPriceExalted || DEFAULT_MARKET_FILTERS.maxPriceExalted,
    minRoiPercent: filters?.minRoiPercent || DEFAULT_MARKET_FILTERS.minRoiPercent,
    maxRoiPercent: filters?.maxRoiPercent || DEFAULT_MARKET_FILTERS.maxRoiPercent
  };
}

export function getFilterNumber(filters: MarketFilters, key: keyof MarketFilters) {
  const parsed = Number(filters[key]);
  return Number.isFinite(parsed) ? parsed : Number(DEFAULT_MARKET_FILTERS[key]);
}

export function getConversionRate(pairs: MarketPair[], fromCurrencyId: string, toCurrencyId: string) {
  if (fromCurrencyId === toCurrencyId) {
    return 1;
  }

  const direct = pairs.find((pair) => pair.baseItemId === fromCurrencyId && pair.quoteItemId === toCurrencyId);
  if (direct) {
    return asPositiveNumber(direct.rate);
  }

  const reverse = pairs.find((pair) => pair.baseItemId === toCurrencyId && pair.quoteItemId === fromCurrencyId);
  const reverseRate = asPositiveNumber(reverse?.rate);
  return reverseRate ? 1 / reverseRate : null;
}

export function getIntegerTradeRows(rate: number, maxItems = MAX_INTEGER_TRADE_ITEMS) {
  if (!Number.isFinite(rate) || rate <= 0) {
    return [];
  }

  const rows: Array<{
    itemCount: number;
    currencyCount: number;
    actualRate: number;
    diffPercent: number;
  }> = [];
  const seen = new Set<string>();

  for (let itemCount = 1; itemCount <= maxItems; itemCount += 1) {
    const currencyCount = Math.max(1, Math.round(rate * itemCount));
    const key = `${itemCount}/${currencyCount}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const actualRate = currencyCount / itemCount;
    const diffPercent = ((actualRate - rate) / rate) * 100;
    if (Math.abs(diffPercent) <= MAX_INTEGER_PRICE_DEVIATION_PERCENT) {
      rows.push({ itemCount, currencyCount, actualRate, diffPercent });
    }
  }

  return rows.slice(0, 8);
}

export function getIntegerRoiRows(result: TargetResult) {
  const buyRows = getIntegerTradeRows(result.buyPrice, MAX_INTEGER_TRADE_ITEMS);
  const sellRows = getIntegerTradeRows(result.sellPrice, MAX_INTEGER_TRADE_ITEMS);

  return buyRows
    .map((buyRow) => {
      const sellRow = sellRows.find((row) => row.itemCount === buyRow.itemCount);
      if (!sellRow) {
        return null;
      }

      const revenue = sellRow.actualRate * result.sellToBuyRate;
      const roi = ((revenue - buyRow.actualRate) / buyRow.actualRate) * 100;
      if (!Number.isFinite(roi) || roi <= 0) {
        return null;
      }

      return {
        itemCount: buyRow.itemCount,
        buyCurrencyCount: buyRow.currencyCount,
        sellCurrencyCount: sellRow.currencyCount,
        actualBuyRate: buyRow.actualRate,
        actualSellRate: sellRow.actualRate,
        roi
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .slice(0, 8);
}

export function getCurrencyModes(items: MarketItem[], pairs: MarketPair[]) {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const modes: MarketRoute[] = [];

  for (const pair of pairs) {
    const base = itemsById.get(pair.baseItemId);
    const quote = itemsById.get(pair.quoteItemId);
    if (!base || !quote) {
      continue;
    }

    modes.push({
      key: `${base.id}|${quote.id}`,
      buyCurrencyId: base.id,
      sellCurrencyId: quote.id,
      buyCurrencyName: base.name,
      sellCurrencyName: quote.name
    });
    modes.push({
      key: `${quote.id}|${base.id}`,
      buyCurrencyId: quote.id,
      sellCurrencyId: base.id,
      buyCurrencyName: quote.name,
      sellCurrencyName: base.name
    });
  }

  return modes.sort((a, b) => {
    const aBuyExalted = a.buyCurrencyName === "Exalted Orb" ? 0 : 1;
    const bBuyExalted = b.buyCurrencyName === "Exalted Orb" ? 0 : 1;
    if (aBuyExalted !== bBuyExalted) {
      return aBuyExalted - bBuyExalted;
    }

    return `${a.buyCurrencyName} ${a.sellCurrencyName}`.localeCompare(`${b.buyCurrencyName} ${b.sellCurrencyName}`);
  });
}

export function getPreferredModeKey(items: MarketItem[], pairs: MarketPair[]) {
  const modes = getCurrencyModes(items, pairs);
  const exaltedToDivine = modes.find(
    (mode) => mode.buyCurrencyName === "Exalted Orb" && mode.sellCurrencyName === "Divine Orb"
  );

  return exaltedToDivine?.key || modes[0]?.key || "";
}

export function getTargetResults(state: MarketState, mode: MarketRoute | undefined) {
  if (!mode) {
    return [];
  }

  const itemsById = new Map(state.items.map((item) => [item.id, item]));
  const sellToBuyRate = getConversionRate(state.pairs, mode.sellCurrencyId, mode.buyCurrencyId);
  if (!sellToBuyRate) {
    return [];
  }

  return state.targets
    .map((target): TargetResult | null => {
      const item = itemsById.get(target.itemId);
      const buyPrice = asPositiveNumber(target.rates?.[mode.buyCurrencyId]);
      const sellPrice = asPositiveNumber(target.rates?.[mode.sellCurrencyId]);
      if (!item || !buyPrice || !sellPrice) {
        return null;
      }

      const revenue = sellPrice * sellToBuyRate;
      const netProfitInBuyCurrency = revenue - buyPrice;
      const netProfitInSellCurrency = netProfitInBuyCurrency / sellToBuyRate;
      const targetGoldCost = asNumber(item.goldCost);
      const sellCurrencyGoldCost = sellPrice * asNumber(itemsById.get(mode.sellCurrencyId)?.goldCost);
      const buyCurrencyGoldCost = revenue * asNumber(itemsById.get(mode.buyCurrencyId)?.goldCost);
      const totalGoldCost = targetGoldCost + sellCurrencyGoldCost + buyCurrencyGoldCost;
      const buyToDivineRate = getConversionRate(state.pairs, mode.buyCurrencyId, "cur-divine-orb");
      const netProfitInDivine = buyToDivineRate ? netProfitInBuyCurrency * buyToDivineRate : null;
      const reverseRate = getConversionRate(state.pairs, mode.buyCurrencyId, mode.sellCurrencyId);
      const reverseRevenue = reverseRate ? buyPrice * reverseRate : null;

      return {
        target,
        item,
        buyPrice,
        sellPrice,
        revenue,
        roi: ((revenue - buyPrice) / buyPrice) * 100,
        netProfitInBuyCurrency,
        netProfitInSellCurrency,
        sellToBuyRate,
        buyPriceExalted: asNumber(target.priceExaltedByCurrency?.[mode.buyCurrencyId]),
        sellPriceExalted: asNumber(target.priceExaltedByCurrency?.[mode.sellCurrencyId]),
        volume: asNumber(target.valueTradedExalted) || parseCompactVolume(item.volume),
        stock: asNumber(target.highestStock),
        goldCost: targetGoldCost,
        totalGoldCost,
        netProfitInDivine,
        goldPerDivineProfit: netProfitInDivine && netProfitInDivine > 0 ? totalGoldCost / netProfitInDivine : null,
        reverseRoi: reverseRevenue ? ((reverseRevenue - sellPrice) / sellPrice) * 100 : null
      };
    })
    .filter((result): result is TargetResult => Boolean(result));
}

export function filterTargetResults(results: TargetResult[], options: ResultFilterOptions) {
  const divineToExalted = getConversionRate(options.pairs, "cur-divine-orb", "cur-exalted-orb") || 1;
  const minValueExalted = getFilterNumber(options.marketFilters, "minTradeValueDivine") * divineToExalted;
  const minStock = getFilterNumber(options.marketFilters, "minStock");
  const minPriceExalted = getFilterNumber(options.marketFilters, "minPriceExalted");
  const maxPriceExalted = getFilterNumber(options.marketFilters, "maxPriceExalted");
  const minRoiPercent = getFilterNumber(options.marketFilters, "minRoiPercent");
  const maxRoiPercent = getFilterNumber(options.marketFilters, "maxRoiPercent");

  return results
    .filter((result) => options.selectedTag === "all" || result.target.tag === options.selectedTag)
    .filter((result) => !options.favoritesOnly || options.favoriteSet.has(result.item.id))
    .filter((result) => result.volume >= minValueExalted)
    .filter((result) => result.stock >= minStock)
    .filter((result) => result.buyPriceExalted >= minPriceExalted && result.buyPriceExalted <= maxPriceExalted)
    .filter((result) => result.sellPriceExalted >= minPriceExalted && result.sellPriceExalted <= maxPriceExalted)
    .filter((result) => result.roi >= minRoiPercent && result.roi <= maxRoiPercent)
    .filter((result) => {
      if (!options.query) {
        return true;
      }

      return [
        result.item.name,
        options.formatItemName(result.item),
        result.target.tag,
        options.formatTag(result.target.tag),
        result.item.source
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(options.query));
    });
}

export function sortTargetResults(
  results: TargetResult[],
  sortKey: string,
  formatItemName: (item: Pick<MarketItem, "name">) => string
) {
  return [...results].sort((a, b) => {
    if (sortKey === "name") {
      return formatItemName(a.item).localeCompare(formatItemName(b.item));
    }
    if (sortKey === "volume") {
      return b.volume - a.volume;
    }
    if (sortKey === "stock") {
      return b.stock - a.stock;
    }
    if (sortKey === "gold") {
      return a.goldCost - b.goldCost;
    }
    if (sortKey === "buy") {
      return a.buyPrice - b.buyPrice;
    }
    if (sortKey === "sell") {
      return b.sellPrice - a.sellPrice;
    }
    if (sortKey === "profit") {
      return b.netProfitInBuyCurrency - a.netProfitInBuyCurrency;
    }
    return b.roi - a.roi;
  });
}

export function getBestBuyCurrencyOptions(
  state: MarketState,
  itemId: string | undefined,
  normalizeCurrencyId = "cur-exalted-orb"
) {
  return getBestCurrencyOptions(state, itemId, { normalizeCurrencyId, side: "buy" });
}

export function getBestSellCurrencyOptions(
  state: MarketState,
  itemId: string | undefined,
  normalizeCurrencyId = "cur-exalted-orb"
) {
  return getBestCurrencyOptions(state, itemId, { normalizeCurrencyId, side: "sell" });
}

function getBestCurrencyOptions(
  state: MarketState,
  itemId: string | undefined,
  options: {
    normalizeCurrencyId: string;
    side: BestCurrencySide;
  }
) {
  if (!itemId) {
    return [];
  }

  const itemsById = new Map(state.items.map((item) => [item.id, item]));
  const target = state.targets.find((candidate) => candidate.itemId === itemId);
  const normalizeCurrency = itemsById.get(options.normalizeCurrencyId);
  if (!target || !normalizeCurrency) {
    return [];
  }

  const candidates: BuyCurrencyCandidate[] = Object.entries(target.rates)
    .map(([currencyId, rawPrice]) => {
      const price = asPositiveNumber(rawPrice);
      const currency = itemsById.get(currencyId);
      if (!price || !currency) {
        return null;
      }

      const conversionRate = getConversionRate(state.pairs, currencyId, options.normalizeCurrencyId);
      const normalizedAmount = conversionRate ? price * conversionRate : null;
      return {
        currencyId,
        currencyName: currency.name,
        price,
        normalizedCost: normalizedAmount,
        normalizedAmount,
        normalizeCurrencyId: options.normalizeCurrencyId,
        normalizeCurrencyName: normalizeCurrency.name,
        conversionRate,
        missingConversion: !conversionRate,
        isBest: false
      };
    })
    .filter((candidate): candidate is BuyCurrencyCandidate => Boolean(candidate));

  const best = candidates
    .filter((candidate) => candidate.normalizedAmount !== null)
    .sort((a, b) =>
      options.side === "sell"
        ? b.normalizedAmount! - a.normalizedAmount!
        : a.normalizedAmount! - b.normalizedAmount!
    )[0];

  return candidates
    .map((candidate) => ({
      ...candidate,
      isBest: candidate.currencyId === best?.currencyId
    }))
    .sort((a, b) => {
      if (a.normalizedAmount === null && b.normalizedAmount === null) {
        return a.currencyName.localeCompare(b.currencyName);
      }
      if (a.normalizedAmount === null) {
        return 1;
      }
      if (b.normalizedAmount === null) {
        return -1;
      }
      return options.side === "sell"
        ? b.normalizedAmount - a.normalizedAmount
        : a.normalizedAmount - b.normalizedAmount;
    });
}

export function getDefaultPlannerValues(result: TargetResult): PlannerValues {
  const integerRows = getIntegerRoiRows(result);
  const firstLot = integerRows[0];

  return {
    buyPayAmount: String(firstLot?.buyCurrencyCount || Math.max(1, Math.round(result.buyPrice))),
    sellItemCount: String(firstLot?.itemCount || 1)
  };
}

export function getManualPlannerResult(values: PlannerValues, result: TargetResult) {
  const buyPayAmount = asPositiveNumber(values.buyPayAmount);
  const sellItemCount = asPositiveNumber(values.sellItemCount);
  const buyItemCount = buyPayAmount ? buyPayAmount / result.buyPrice : null;
  const sellGetAmount = sellItemCount ? sellItemCount * result.sellPrice : null;

  const buyRate = buyItemCount && buyPayAmount ? buyPayAmount / buyItemCount : null;
  const sellRate = sellItemCount && sellGetAmount ? sellGetAmount / sellItemCount : null;
  const revenueInBuyCurrency = sellRate ? sellRate * result.sellToBuyRate : null;
  const profitPerItem = buyRate && revenueInBuyCurrency ? revenueInBuyCurrency - buyRate : null;
  const roi = buyRate && profitPerItem !== null ? (profitPerItem / buyRate) * 100 : null;
  const batchItemCount = sellItemCount || buyItemCount || 0;

  return {
    buyRate,
    sellRate,
    revenueInBuyCurrency,
    profitPerItem,
    roi,
    buyRateDelta: buyRate ? ((buyRate - result.buyPrice) / result.buyPrice) * 100 : null,
    sellRateDelta: sellRate ? ((sellRate - result.sellPrice) / result.sellPrice) * 100 : null,
    roiDelta: roi !== null ? roi - result.roi : null,
    buyItemCount,
    sellGetAmount,
    batchSellGet: sellGetAmount,
    batchProfit: profitPerItem !== null && batchItemCount ? profitPerItem * batchItemCount : null
  };
}
