import { resolve } from "node:path";

import { readMarketDataFile } from "./market-snapshot-storage.mjs";

export type MarketItem = {
  id: string;
  name: string;
  category: "currency" | "target" | string;
  tag?: string;
  source?: string;
  volume?: string;
  change?: string;
  goldCost?: string;
  iconUrl?: string;
  tagIconUrl?: string;
};

export type MarketPair = {
  id: string;
  baseItemId: string;
  quoteItemId: string;
  rate: string;
};

export type MarketTarget = {
  id: string;
  itemId: string;
  tag?: string;
  valueTradedExalted?: number;
  highestStock?: number;
  priceExaltedByCurrency?: Record<string, string>;
  rates: Record<string, string>;
};

export type TopOpportunity = {
  name: string;
  category: string;
  buyCurrency: string;
  sellCurrency: string;
  buyPrice: number;
  sellPrice: number;
  roi: number;
  volume?: string;
  change?: string;
  maxVolumeCurrency?: string;
};

export type MarketState = {
  activeTab?: string;
  selectedModeKey?: string;
  selectedTag?: string;
  items: MarketItem[];
  targets: MarketTarget[];
  pairs: MarketPair[];
  importedFrom?: string;
  importedAt?: string;
  filters?: Record<string, string | number>;
  topOpportunities?: TopOpportunity[];
};

export type MarketData = {
  schemaVersion?: number;
  role?: "baseline" | string;
  generatedAt?: string;
  league?: string;
  source?: string;
  snapshotEpoch?: number;
  state: MarketState;
  topOpportunities?: TopOpportunity[];
};

export async function readMarketData(): Promise<MarketData> {
  const dataFile = resolve(process.cwd(), "public/poe-ninja-data.js");
  return readMarketDataFile(dataFile);
}

export function toPublicMarketData(data: MarketData): MarketData {
  const {
    source: _source,
    state: { importedFrom: _importedFrom, items, ...state },
    ...rest
  } = data;

  return {
    ...rest,
    state: {
      ...state,
      items: items.map(({ source: _itemSource, ...item }) => item)
    }
  };
}

export function toMarketDataShell(data: MarketData): MarketData {
  return {
    schemaVersion: data.schemaVersion,
    role: data.role,
    generatedAt: data.generatedAt,
    league: data.league,
    snapshotEpoch: data.snapshotEpoch,
    state: {
      importedAt: data.state.importedAt,
      items: [],
      targets: [],
      pairs: [],
      filters: data.state.filters
    }
  };
}
