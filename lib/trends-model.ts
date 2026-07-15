import type { MarketItem, MarketState } from "./market-data.ts";
import {
  filterTargetResults,
  getCurrencyModes,
  getTargetResults,
  normalizeFilters,
  type MarketFilters,
  type MarketRoute,
  type TargetResult
} from "./market-arbitrage.ts";
import type { MarketTrendIndex, ProfitPersistenceWindow, TrendSeriesPoint } from "./market-trend-index.ts";
import { getTrendRouteKey } from "./market-trend-index.ts";

export type TrendRouteRow = {
  key: string;
  result: TargetResult;
  mode: MarketRoute;
  item: MarketItem;
  roiSeries: TrendSeriesPoint[];
  persistence24h: ProfitPersistenceWindow | null;
  persistence7d: ProfitPersistenceWindow | null;
};

export type TrendRouteFilters = {
  query: string;
  category: string;
  minSamples: number;
  minPersistence24h: number;
  minPersistence7d: number;
};

export type TrendInsightKind = "consistent" | "improving" | "liquid";

export type TrendRouteInsight = {
  kind: TrendInsightKind;
  row: TrendRouteRow;
  delta: number | null;
};

export function buildTrendRows(
  state: MarketState,
  trendIndex: MarketTrendIndex | null | undefined,
  marketFilters: MarketFilters = normalizeFilters(undefined)
) {
  const rows: TrendRouteRow[] = [];

  for (const mode of getCurrencyModes(state.items, state.pairs)) {
    const filteredResults = filterTargetResults(getTargetResults(state, mode), {
      query: "",
      favoriteSet: new Set<string>(),
      selectedTag: "all",
      favoritesOnly: false,
      marketFilters,
      pairs: state.pairs,
      formatItemName: (item) => item.name,
      formatTag: (tag) => tag || ""
    });

    for (const result of filteredResults) {
      const key = getTrendRouteKey(result.target.itemId, mode.buyCurrencyId, mode.sellCurrencyId);
      const trendRoute = trendIndex?.routes[key];
      rows.push({
        key,
        result,
        mode,
        item: result.item,
        roiSeries: trendRoute?.roiSeries || [],
        persistence24h: trendRoute?.profitPersistence["24h"] || null,
        persistence7d: trendRoute?.profitPersistence["7d"] || null
      });
    }
  }

  return rows.sort(compareTrendRows);
}

export function getTrendRouteRow(
  state: MarketState,
  trendIndex: MarketTrendIndex | null | undefined,
  routeKey: string
) {
  for (const mode of getCurrencyModes(state.items, state.pairs)) {
    for (const result of getTargetResults(state, mode)) {
      const key = getTrendRouteKey(result.target.itemId, mode.buyCurrencyId, mode.sellCurrencyId);
      if (key !== routeKey) {
        continue;
      }

      const trendRoute = trendIndex?.routes[key];
      return {
        key,
        result,
        mode,
        item: result.item,
        roiSeries: trendRoute?.roiSeries || [],
        persistence24h: trendRoute?.profitPersistence["24h"] || null,
        persistence7d: trendRoute?.profitPersistence["7d"] || null
      };
    }
  }

  return null;
}

export function filterTrendRows(
  rows: TrendRouteRow[],
  filters: TrendRouteFilters,
  formatItemName: (item: Pick<MarketItem, "name">) => string,
  formatTag: (tag: string | undefined) => string
) {
  const query = filters.query.trim().toLowerCase();

  return rows
    .filter((row) => filters.category === "all" || row.item.tag === filters.category || row.result.target.tag === filters.category)
    .filter((row) => getTotalSamples(row) >= filters.minSamples)
    .filter((row) => matchesMinPersistence(row.persistence24h, filters.minPersistence24h))
    .filter((row) => matchesMinPersistence(row.persistence7d, filters.minPersistence7d))
    .filter((row) => {
      if (!query) {
        return true;
      }

      return [
        row.item.name,
        formatItemName(row.item),
        row.mode.buyCurrencyName,
        row.mode.sellCurrencyName,
        row.item.tag,
        row.result.target.tag,
        formatTag(row.item.tag),
        formatTag(row.result.target.tag)
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
}

export function getTrendCategories(rows: TrendRouteRow[]) {
  return Array.from(
    new Set(
      rows
        .map((row) => row.item.tag || row.result.target.tag)
        .filter((category): category is string => Boolean(category))
    )
  ).sort();
}

export function getTrendRouteInsights(rows: TrendRouteRow[]) {
  const insights: TrendRouteInsight[] = [];
  const used = new Set<string>();

  const consistent = pickFirstUnused([...rows].sort(compareConsistentRows), used);
  if (consistent) {
    insights.push({ kind: "consistent", row: consistent, delta: getTrendSeriesDelta(consistent.roiSeries) });
  }

  const improving = pickFirstUnused(
    rows
      .map((row) => ({ row, delta: getTrendSeriesDelta(row.roiSeries) }))
      .filter((entry): entry is { row: TrendRouteRow; delta: number } => entry.delta !== null)
      .sort(
        (left, right) =>
          right.delta - left.delta ||
          getPersistencePercent(right.row.persistence7d) - getPersistencePercent(left.row.persistence7d) ||
          right.row.result.volume - left.row.result.volume
      )
      .map((entry) => entry.row),
    used
  );
  if (improving) {
    insights.push({ kind: "improving", row: improving, delta: getTrendSeriesDelta(improving.roiSeries) });
  }

  const liquid = pickFirstUnused([...rows].sort(compareLiquidRows), used);
  if (liquid) {
    insights.push({ kind: "liquid", row: liquid, delta: getTrendSeriesDelta(liquid.roiSeries) });
  }

  return insights;
}

export function getTrendSeriesDelta(points: TrendSeriesPoint[]) {
  if (points.length < 2) {
    return null;
  }

  return points[points.length - 1].roi - points[0].roi;
}

function compareTrendRows(left: TrendRouteRow, right: TrendRouteRow) {
  return (
    getPersistencePercent(right.persistence7d) - getPersistencePercent(left.persistence7d) ||
    getTotalSamples(right) - getTotalSamples(left) ||
    getPersistencePercent(right.persistence24h) - getPersistencePercent(left.persistence24h) ||
    right.result.roi - left.result.roi ||
    right.result.volume - left.result.volume ||
    left.item.name.localeCompare(right.item.name)
  );
}

function compareConsistentRows(left: TrendRouteRow, right: TrendRouteRow) {
  return (
    getPersistencePercent(right.persistence7d) - getPersistencePercent(left.persistence7d) ||
    getPersistencePercent(right.persistence24h) - getPersistencePercent(left.persistence24h) ||
    getTotalSamples(right) - getTotalSamples(left) ||
    right.result.roi - left.result.roi ||
    right.result.volume - left.result.volume ||
    left.item.name.localeCompare(right.item.name)
  );
}

function compareLiquidRows(left: TrendRouteRow, right: TrendRouteRow) {
  return (
    right.result.volume - left.result.volume ||
    right.result.stock - left.result.stock ||
    getPersistencePercent(right.persistence7d) - getPersistencePercent(left.persistence7d) ||
    right.result.roi - left.result.roi ||
    left.item.name.localeCompare(right.item.name)
  );
}

function pickFirstUnused(rows: TrendRouteRow[], used: Set<string>) {
  const row = rows.find((candidate) => !used.has(candidate.key));
  if (row) {
    used.add(row.key);
  }
  return row;
}

function getPersistencePercent(value: ProfitPersistenceWindow | null) {
  return value?.percent ?? -1;
}

function matchesMinPersistence(value: ProfitPersistenceWindow | null, threshold: number) {
  return threshold <= 0 || (value?.percent ?? -1) >= threshold;
}

function getTotalSamples(row: TrendRouteRow) {
  return Math.max(row.persistence24h?.totalSamples || 0, row.persistence7d?.totalSamples || 0);
}
