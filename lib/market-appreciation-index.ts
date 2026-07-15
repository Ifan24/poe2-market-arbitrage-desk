import type { MarketData, MarketItem, MarketState } from "./market-data.ts";
import { asNumber, asPositiveNumber } from "./market-arbitrage.ts";

export type AppreciationWindowKey = "24h" | "7d";

export type AppreciationSignal = "rising" | "stable" | "volatile" | "thin";

export type AppreciationSeriesPoint = {
  at: string;
  priceDivine: number;
  priceExalted: number | null;
  volume: number;
  stock: number;
};

export type AppreciationWindow = {
  samples: number;
  changePercent: number | null;
  volatilityPercent: number | null;
  maxDrawdownPercent: number | null;
};

export type AppreciationAsset = {
  itemId: string;
  name: string;
  category: string;
  tag?: string;
  currentPriceDivine: number;
  currentPriceExalted: number | null;
  currentVolume: number;
  currentStock: number;
  signal: AppreciationSignal;
  confidence: number;
  series: AppreciationSeriesPoint[];
  windows: Record<AppreciationWindowKey, AppreciationWindow>;
};

export type MarketAppreciationIndex = {
  schemaVersion: 1;
  league: {
    id: string;
    name: string;
  };
  generatedAt: string;
  windows: AppreciationWindowKey[];
  assetCount: number;
  sampleCount: number;
  assets: Record<string, AppreciationAsset>;
};

type OrderedSnapshot = {
  importedAt: string;
  snapshot: MarketData;
  samples: Map<string, AssetSample>;
};

type AssetSample = {
  itemId: string;
  name: string;
  category: string;
  tag?: string;
  priceDivine: number;
  priceExalted: number | null;
  volume: number;
  stock: number;
};

const WINDOWS: Record<AppreciationWindowKey, number> = {
  "24h": 24,
  "7d": 24 * 7
};

const MIN_STORE_VALUE_DIVINE = 0.5;
const MIN_RISING_SAMPLES = 4;

export function buildMarketAppreciationIndex({
  snapshots,
  league,
  generatedAt = new Date().toISOString()
}: {
  snapshots: MarketData[];
  league: { id: string; name: string };
  generatedAt?: string;
}): MarketAppreciationIndex {
  const orderedSnapshots = snapshots
    .filter((snapshot) => snapshot?.state)
    .map((snapshot) => ({
      snapshot,
      importedAt: getSnapshotTime(snapshot),
      samples: getAssetSamples(snapshot.state)
    }))
    .filter((entry): entry is OrderedSnapshot => Boolean(entry.importedAt))
    .sort((left, right) => new Date(left.importedAt).valueOf() - new Date(right.importedAt).valueOf());

  const current = orderedSnapshots.at(-1);
  const generatedTime = new Date(current?.importedAt || generatedAt);
  const assets: Record<string, AppreciationAsset> = {};

  for (const latest of [...(current?.samples.values() || [])].sort((left, right) => left.name.localeCompare(right.name))) {
    if (latest.priceDivine < MIN_STORE_VALUE_DIVINE) {
      continue;
    }

    const series = summarizeSeries(orderedSnapshots, latest.itemId, generatedTime, WINDOWS["7d"]);
    const windows = {
      "24h": summarizeWindow(series, generatedTime, WINDOWS["24h"]),
      "7d": summarizeWindow(series, generatedTime, WINDOWS["7d"])
    };
    const signal = classifySignal(latest, windows);

    assets[latest.itemId] = {
      itemId: latest.itemId,
      name: latest.name,
      category: latest.category,
      tag: latest.tag,
      currentPriceDivine: round(latest.priceDivine),
      currentPriceExalted: latest.priceExalted === null ? null : round(latest.priceExalted),
      currentVolume: Math.round(latest.volume),
      currentStock: Math.round(latest.stock),
      signal,
      confidence: getConfidence(latest, windows),
      series,
      windows
    };
  }

  return {
    schemaVersion: 1,
    league,
    generatedAt: generatedTime.toISOString(),
    windows: ["24h", "7d"],
    assetCount: Object.keys(assets).length,
    sampleCount: orderedSnapshots.length,
    assets
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

function getAssetSamples(state: MarketState) {
  const itemsById = new Map(state.items.map((item) => [item.id, item]));
  const samples = new Map<string, AssetSample>();

  for (const target of state.targets) {
    const item = itemsById.get(target.itemId);
    const priceDivine = asPositiveNumber(target.rates?.["cur-divine-orb"]);
    if (!item || !priceDivine) {
      continue;
    }

    samples.set(item.id, {
      itemId: item.id,
      name: item.name,
      category: item.category,
      tag: target.tag || item.tag,
      priceDivine,
      priceExalted: asPositiveNumber(target.priceExaltedByCurrency?.["cur-divine-orb"]),
      volume: asNumber(target.valueTradedExalted),
      stock: asNumber(target.highestStock)
    });
  }

  return samples;
}

function summarizeSeries(
  snapshots: OrderedSnapshot[],
  itemId: string,
  generatedTime: Date,
  windowHours: number
): AppreciationSeriesPoint[] {
  const cutoff = generatedTime.valueOf() - windowHours * 60 * 60 * 1000;
  const points: AppreciationSeriesPoint[] = [];

  for (const { importedAt, samples } of snapshots) {
    const sampleTime = new Date(importedAt).valueOf();
    if (sampleTime < cutoff || sampleTime > generatedTime.valueOf()) {
      continue;
    }

    const sample = samples.get(itemId);
    if (!sample) {
      continue;
    }

    points.push({
      at: importedAt,
      priceDivine: round(sample.priceDivine),
      priceExalted: sample.priceExalted === null ? null : round(sample.priceExalted),
      volume: Math.round(sample.volume),
      stock: Math.round(sample.stock)
    });
  }

  return points;
}

function summarizeWindow(
  series: AppreciationSeriesPoint[],
  generatedTime: Date,
  windowHours: number
): AppreciationWindow {
  const cutoff = generatedTime.valueOf() - windowHours * 60 * 60 * 1000;
  const points = series.filter((point) => {
    const sampleTime = new Date(point.at).valueOf();
    return sampleTime >= cutoff && sampleTime <= generatedTime.valueOf();
  });

  if (points.length < 2) {
    return {
      samples: points.length,
      changePercent: null,
      volatilityPercent: null,
      maxDrawdownPercent: null
    };
  }

  const prices = points.map((point) => point.priceDivine);
  const first = prices[0];
  const latest = prices.at(-1) || first;
  const returns = prices.slice(1).map((price, index) => ((price - prices[index]) / prices[index]) * 100);

  return {
    samples: points.length,
    changePercent: round(((latest - first) / first) * 100),
    volatilityPercent: round(standardDeviation(returns)),
    maxDrawdownPercent: round(getMaxDrawdownPercent(prices))
  };
}

function classifySignal(asset: AssetSample, windows: Record<AppreciationWindowKey, AppreciationWindow>): AppreciationSignal {
  const sevenDay = windows["7d"];
  const latestVolatility = sevenDay.volatilityPercent ?? 0;
  const latestDrawdown = Math.abs(sevenDay.maxDrawdownPercent ?? 0);

  if (sevenDay.samples < MIN_RISING_SAMPLES || asset.volume < 1000 || asset.stock <= 0) {
    return "thin";
  }

  if (latestVolatility >= 35 || latestDrawdown >= 35) {
    return "volatile";
  }

  if ((sevenDay.changePercent ?? 0) >= 10) {
    return "rising";
  }

  return "stable";
}

function getConfidence(asset: AssetSample, windows: Record<AppreciationWindowKey, AppreciationWindow>) {
  const sevenDay = windows["7d"];
  const sampleScore = Math.min(45, sevenDay.samples * 6);
  const volumeScore = Math.min(25, Math.log10(Math.max(asset.volume, 1)) * 5);
  const stockScore = Math.min(15, Math.log10(Math.max(asset.stock, 1)) * 4);
  const volatilityPenalty = Math.min(25, sevenDay.volatilityPercent ?? 25);
  return Math.max(0, Math.min(100, Math.round(sampleScore + volumeScore + stockScore - volatilityPenalty)));
}

function standardDeviation(values: number[]) {
  if (!values.length) {
    return 0;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function getMaxDrawdownPercent(prices: number[]) {
  let peak = prices[0] || 0;
  let drawdown = 0;

  for (const price of prices) {
    peak = Math.max(peak, price);
    if (peak > 0) {
      drawdown = Math.min(drawdown, ((price - peak) / peak) * 100);
    }
  }

  return drawdown;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
