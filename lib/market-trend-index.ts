import type { MarketData, MarketState } from "./market-data.ts";
import { getCurrencyModes, getTargetResults } from "./market-arbitrage.ts";
import { buildMarketAppreciationIndex, type MarketAppreciationIndex } from "./market-appreciation-index.ts";

export type TrendWindowKey = "24h" | "7d";

export type ProfitPersistenceWindow = {
  profitableSamples: number;
  totalSamples: number;
  percent: number | null;
};

export type TrendSeriesPoint = {
  at: string;
  roi: number;
  volume: number;
};

export type TrendIndexRoute = {
  key: string;
  targetItemId: string;
  buyCurrencyId: string;
  sellCurrencyId: string;
  currentRoiPercent: number;
  currentVolume: number;
  roiSeries: TrendSeriesPoint[];
  profitPersistence: Record<TrendWindowKey, ProfitPersistenceWindow>;
};

export type MarketTrendIndex = {
  schemaVersion: 1;
  league: {
    id: string;
    name: string;
  };
  generatedAt: string;
  windows: TrendWindowKey[];
  routeCount: number;
  sampleCount: number;
  appreciation: MarketAppreciationIndex;
  routes: Record<string, TrendIndexRoute>;
};

type RouteSample = {
  key: string;
  targetItemId: string;
  buyCurrencyId: string;
  sellCurrencyId: string;
  roi: number;
  volume: number;
};

const WINDOWS: Record<TrendWindowKey, number> = {
  "24h": 24,
  "7d": 24 * 7
};

export function buildMarketTrendIndex({
  snapshots,
  league,
  generatedAt = new Date().toISOString()
}: {
  snapshots: MarketData[];
  league: { id: string; name: string };
  generatedAt?: string;
}): MarketTrendIndex {
  const orderedSnapshots = snapshots
    .filter((snapshot) => snapshot?.state)
    .map((snapshot) => ({
      snapshot,
      importedAt: getSnapshotTime(snapshot),
      routeSamples: getRouteSamples(snapshot.state)
    }))
    .filter(
      (entry): entry is { snapshot: MarketData; importedAt: string; routeSamples: Map<string, RouteSample> } =>
        Boolean(entry.importedAt)
    )
    .sort((left, right) => new Date(left.importedAt).valueOf() - new Date(right.importedAt).valueOf());

  const current = orderedSnapshots.at(-1);
  const currentRoutes = current ? getProfitableRoutes(current.snapshot.state) : new Map<string, RouteSample>();
  const generatedTime = new Date(current?.importedAt || generatedAt);
  const routes: Record<string, TrendIndexRoute> = {};

  for (const route of [...currentRoutes.values()].sort((left, right) => left.key.localeCompare(right.key))) {
    routes[route.key] = {
      key: route.key,
      targetItemId: route.targetItemId,
      buyCurrencyId: route.buyCurrencyId,
      sellCurrencyId: route.sellCurrencyId,
      currentRoiPercent: roundPercent(route.roi),
      currentVolume: Math.round(route.volume),
      roiSeries: summarizeSeries(orderedSnapshots, route.key, generatedTime, WINDOWS["7d"]),
      profitPersistence: {
        "24h": summarizeWindow(orderedSnapshots, route.key, generatedTime, WINDOWS["24h"]),
        "7d": summarizeWindow(orderedSnapshots, route.key, generatedTime, WINDOWS["7d"])
      }
    };
  }

  return {
    schemaVersion: 1,
    league,
    generatedAt: generatedTime.toISOString(),
    windows: ["24h", "7d"],
    routeCount: Object.keys(routes).length,
    sampleCount: orderedSnapshots.length,
    appreciation: buildMarketAppreciationIndex({
      snapshots: orderedSnapshots.map((entry) => entry.snapshot),
      league,
      generatedAt: generatedTime.toISOString()
    }),
    routes
  };
}

function getSnapshotTime(snapshot: MarketData) {
  const value = snapshot.state.importedAt || snapshot.generatedAt;
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function getRouteSamples(state: MarketState) {
  const samples = new Map<string, RouteSample>();

  for (const mode of getCurrencyModes(state.items, state.pairs)) {
    for (const result of getTargetResults(state, mode)) {
      const key = getTrendRouteKey(result.target.itemId, mode.buyCurrencyId, mode.sellCurrencyId);
      samples.set(key, {
        key,
        targetItemId: result.target.itemId,
        buyCurrencyId: mode.buyCurrencyId,
        sellCurrencyId: mode.sellCurrencyId,
        roi: result.roi,
        volume: result.volume
      });
    }
  }

  return samples;
}

function getProfitableRoutes(state: MarketState) {
  const samples = getRouteSamples(state);
  return new Map([...samples].filter(([, sample]) => sample.roi > 0));
}

function summarizeWindow(
  snapshots: Array<{ snapshot: MarketData; importedAt: string; routeSamples: Map<string, RouteSample> }>,
  routeKey: string,
  generatedTime: Date,
  windowHours: number
): ProfitPersistenceWindow {
  const cutoff = generatedTime.valueOf() - windowHours * 60 * 60 * 1000;
  let profitableSamples = 0;
  let totalSamples = 0;

  for (const { importedAt, routeSamples } of snapshots) {
    const sampleTime = new Date(importedAt).valueOf();
    if (sampleTime < cutoff || sampleTime > generatedTime.valueOf()) {
      continue;
    }

    const sample = routeSamples.get(routeKey);
    if (!sample) {
      continue;
    }

    totalSamples += 1;
    if (sample.roi > 0) {
      profitableSamples += 1;
    }
  }

  return {
    profitableSamples,
    totalSamples,
    percent: totalSamples ? roundPercent((profitableSamples / totalSamples) * 100) : null
  };
}

function summarizeSeries(
  snapshots: Array<{ snapshot: MarketData; importedAt: string; routeSamples: Map<string, RouteSample> }>,
  routeKey: string,
  generatedTime: Date,
  windowHours: number
): TrendSeriesPoint[] {
  const cutoff = generatedTime.valueOf() - windowHours * 60 * 60 * 1000;
  const points: TrendSeriesPoint[] = [];

  for (const { importedAt, routeSamples } of snapshots) {
    const sampleTime = new Date(importedAt).valueOf();
    if (sampleTime < cutoff || sampleTime > generatedTime.valueOf()) {
      continue;
    }

    const sample = routeSamples.get(routeKey);
    if (!sample) {
      continue;
    }

    points.push({
      at: importedAt,
      roi: roundPercent(sample.roi),
      volume: Math.round(sample.volume)
    });
  }

  return points;
}

export function getTrendRouteKey(targetItemId: string, buyCurrencyId: string, sellCurrencyId: string) {
  return `${targetItemId}|${buyCurrencyId}|${sellCurrencyId}`;
}

function roundPercent(value: number) {
  return Math.round(value * 100) / 100;
}
