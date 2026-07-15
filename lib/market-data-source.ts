import { resolve } from "node:path";

import { readMarketDataFile } from "./market-snapshot-storage.mjs";
import type { MarketData } from "./market-data";

const DEFAULT_MARKET_DATA_BASE_URL = "https://data.poe2marketdesk.com";

export type MarketDataManifest = {
  schemaVersion: number;
  provider: string;
  realm: string;
  activeLeague: {
    id: string;
    name: string;
    hardcore: boolean;
  };
  generatedAt: string;
  expectedRefreshIntervalMinutes: number;
  staleAfterMinutes: number;
  veryStaleAfterMinutes: number;
  snapshot: {
    url: string;
    contentType: string;
  };
};

export type MarketDataStatus = {
  ok: boolean;
  lastSuccessfulAt?: string;
  lastAttemptAt?: string;
  activeLeague?: {
    id: string;
    name: string;
  };
  provider?: string;
  message?: string;
};

export type MarketDataSourceConfig = {
  baseUrl: string;
  manifestPath: string;
  statusPath: string;
  trendIndexPath: string;
  requireRemote: boolean;
};

export type MarketDataBootstrap = {
  initialData: MarketData;
  source: MarketDataSourceConfig;
};

function normalizeBaseUrl(value: string | undefined) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizePath(value: string | undefined, fallback: string) {
  const path = String(value || fallback).trim() || fallback;
  return path.startsWith("/") ? path : `/${path}`;
}

export function getMarketDataSourceConfig(
  env: NodeJS.ProcessEnv = process.env
): MarketDataSourceConfig {
  const baseUrl = normalizeBaseUrl(env.NEXT_PUBLIC_MARKET_DATA_BASE_URL || DEFAULT_MARKET_DATA_BASE_URL);
  return {
    baseUrl,
    manifestPath: normalizePath(env.NEXT_PUBLIC_MARKET_DATA_MANIFEST_PATH, "/manifest.json"),
    statusPath: normalizePath(env.NEXT_PUBLIC_MARKET_DATA_STATUS_PATH, "/status.json"),
    trendIndexPath: normalizePath(env.NEXT_PUBLIC_MARKET_TREND_INDEX_PATH, "/trend-index.json"),
    requireRemote: Boolean(baseUrl)
  };
}

export async function readLocalMarketDataFallback(): Promise<MarketData> {
  const dataFile = resolve(process.cwd(), "public/market-baseline.json");
  return readMarketDataFile(dataFile);
}

export async function readMarketDataBootstrap(): Promise<MarketDataBootstrap> {
  return {
    initialData: await readLocalMarketDataFallback(),
    source: getMarketDataSourceConfig()
  };
}

export function resolveMarketDataUrl(baseUrl: string, pathOrUrl: string) {
  return new URL(pathOrUrl, `${baseUrl.replace(/\/+$/, "")}/`).toString();
}
