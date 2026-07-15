import type { MarketData } from "./market-data";
export { readMarketDataFile } from "./market-snapshot-storage.mjs";

export const DEFAULT_REFRESH_COOLDOWN_MS: number;
export const DEFAULT_SERVER_REFRESH_MINUTE: number;

export type RefreshResult = {
  ok: true;
  refreshed: boolean;
  reused: boolean;
  reason: "cooldown" | "server-window" | "stale";
  startedAt: string;
  finishedAt: string;
  cooldownMs: number;
  snapshotImportedAt?: string;
  nextRefreshAt: string | null;
  log: string;
  data: MarketData;
};

export function getSnapshotFreshness(
  data: MarketData | undefined,
  now?: number,
  cooldownMs?: number,
  serverRefreshMinute?: number
): {
  fresh: boolean;
  importedAt?: string;
  ageMs: number | null;
  nextRefreshAt: string | null;
  reason: "cooldown" | "server-window" | "stale";
  latestServerRefreshAt: string;
};
export function getLatestServerRefreshAt(now?: number, serverRefreshMinute?: number): string;
export function getNextServerRefreshAt(now?: number, serverRefreshMinute?: number): string;
export function refreshMarketData(options?: {
  projectDir?: string;
  updateScript?: string;
  dataFile?: string;
  dataJsonFile?: string;
  cooldownMs?: number;
  serverRefreshMinute?: number;
  now?: number;
}): Promise<RefreshResult>;
