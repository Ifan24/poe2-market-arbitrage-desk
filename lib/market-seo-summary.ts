import {
  getCurrencyModes,
  getTargetResults,
  parseCompactVolume
} from "./market-arbitrage.ts";
import type { MarketData } from "./market-data.ts";

export type MarketSeoSummaryRoute = {
  targetName: string;
  category: string;
  buyCurrency: string;
  sellCurrency: string;
  roiPercent: number;
  volume: number;
};

export type MarketSeoSummaryCategory = {
  name: string;
  targetCount: number;
};

export type MarketSeoSummary = {
  schemaVersion: 1;
  league: {
    id: string;
    name: string;
  };
  generatedAt: string;
  itemCount: number;
  targetCount: number;
  topRoutes: MarketSeoSummaryRoute[];
  topCategories: MarketSeoSummaryCategory[];
};

export function buildMarketSeoSummary(
  marketData: MarketData,
  options: {
    leagueId?: string;
    leagueName?: string;
    maxRoutes?: number;
    maxCategories?: number;
  } = {}
): MarketSeoSummary {
  const state = marketData.state;
  const leagueName = options.leagueName || marketData.league || "Current league";
  const leagueId = options.leagueId || slugify(leagueName);
  const targetCountByTag = new Map<string, number>();

  for (const target of state.targets) {
    const tag = target.tag || "Other";
    targetCountByTag.set(tag, (targetCountByTag.get(tag) || 0) + 1);
  }

  const topRoutes = getCompactTopRoutes(marketData, options.maxRoutes ?? 8);

  return {
    schemaVersion: 1,
    league: {
      id: leagueId,
      name: leagueName
    },
    generatedAt: state.importedAt || marketData.generatedAt || new Date().toISOString(),
    itemCount: state.items.length,
    targetCount: state.targets.length,
    topRoutes,
    topCategories: [...targetCountByTag]
      .map(([name, targetCount]) => ({ name, targetCount }))
      .sort((left, right) => right.targetCount - left.targetCount || left.name.localeCompare(right.name))
      .slice(0, options.maxCategories ?? 8)
  };
}

function getCompactTopRoutes(marketData: MarketData, maxRoutes: number): MarketSeoSummaryRoute[] {
  const opportunities = marketData.topOpportunities || marketData.state.topOpportunities || [];
  if (opportunities.length) {
    return opportunities
      .map((opportunity) => ({
        targetName: opportunity.name,
        category: opportunity.category,
        buyCurrency: opportunity.buyCurrency,
        sellCurrency: opportunity.sellCurrency,
        roiPercent: round(opportunity.roi),
        volume: parseCompactVolume(opportunity.volume)
      }))
      .filter((route) => Number.isFinite(route.roiPercent) && route.roiPercent > 0)
      .slice(0, maxRoutes);
  }

  const state = marketData.state;
  const itemsById = new Map(state.items.map((item) => [item.id, item]));
  return getCurrencyModes(state.items, state.pairs)
    .flatMap((mode) =>
      getTargetResults(state, mode).map((result) => ({
        targetName: result.item.name,
        category: result.target.tag || result.item.tag || result.item.category,
        buyCurrency: mode.buyCurrencyName,
        sellCurrency: mode.sellCurrencyName,
        roiPercent: round(result.roi),
        volume: result.volume || parseCompactVolume(itemsById.get(result.target.itemId)?.volume)
      }))
    )
    .filter((route) => Number.isFinite(route.roiPercent) && route.roiPercent > 0)
    .sort((left, right) => right.roiPercent - left.roiPercent || right.volume - left.volume)
    .slice(0, maxRoutes);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "current";
}
