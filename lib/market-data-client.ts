import { useEffect, useState } from "react";

import type { MarketData } from "./market-data";
import type { MarketDataManifest, MarketDataSourceConfig, MarketDataStatus } from "./market-data-source";
import type { MarketTrendIndex } from "./market-trend-index";
import {
  loadSitePreferences,
  saveSitePreferences,
  subscribeSitePreferences
} from "./site-preferences.ts";

export function resolveSelectedLeagueId(root: MarketDataManifest, preferredLeagueId: string): string {
  const defaultLeagueId = root.defaultLeagueId || root.activeLeague.id;
  if (!root.availableLeagues) {
    return root.activeLeague.id;
  }
  return root.availableLeagues.some((league) => !league.hardcore && league.id === preferredLeagueId)
    ? preferredLeagueId
    : defaultLeagueId;
}

export function useSelectedLeagueId() {
  const [selectedLeagueId, setSelectedLeagueId] = useState(() => loadSitePreferences().selectedLeagueId);
  useEffect(() => subscribeSitePreferences((preferences) => {
    setSelectedLeagueId(preferences.selectedLeagueId);
  }), []);
  return selectedLeagueId;
}

export function resolveMarketDataUrl(baseUrl: string, path: string) {
  return new URL(path, `${baseUrl.replace(/\/+$/, "")}/`).toString();
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function loadMarketDataBundle(
  source: MarketDataSourceConfig,
  { signal, preferredLeagueId = loadSitePreferences().selectedLeagueId, includeStatus = false, includeTrend = false }: {
    signal?: AbortSignal;
    preferredLeagueId?: string;
    includeStatus?: boolean;
    includeTrend?: boolean;
  } = {}
) {
  signal?.throwIfAborted();
  const root = await fetchJson<MarketDataManifest>(resolveMarketDataUrl(source.baseUrl, source.manifestPath), signal);
  const selectedLeagueId = resolveSelectedLeagueId(root, preferredLeagueId);
  const selectedLeague = root.availableLeagues?.find((league) => league.id === selectedLeagueId && !league.hardcore);
  const isRootLeague = selectedLeagueId === root.activeLeague.id;
  if (!isRootLeague && !selectedLeague) {
    throw new Error(`No market manifest for selected league ${selectedLeagueId}`);
  }
  const manifest = isRootLeague
    ? root
    : await fetchJson<MarketDataManifest>(resolveMarketDataUrl(source.baseUrl, selectedLeague!.manifest.url), signal);
  signal?.throwIfAborted();
  if (manifest.activeLeague.id !== selectedLeagueId) {
    throw new Error(`Market manifest does not match selected league ${selectedLeagueId}`);
  }

  // A selected non-default league must never reuse the root artifacts.
  const statusPath = manifest.status?.url || (isRootLeague ? source.statusPath : undefined);
  const trendPath = manifest.trendIndex?.url || (isRootLeague ? source.trendIndexPath : undefined);
  const optionalJson = <T>(path: string | undefined) => path
    ? fetchJson<T>(resolveMarketDataUrl(source.baseUrl, path), signal).catch((error: unknown) => {
        signal?.throwIfAborted();
        if (error instanceof Error && error.name === "AbortError") throw error;
        return null;
      })
    : Promise.resolve(null);
  const [snapshot, status, trend] = await Promise.all([
    fetchJson<MarketData>(resolveMarketDataUrl(source.baseUrl, manifest.snapshot.url), signal),
    optionalJson<MarketDataStatus>(includeStatus ? statusPath : undefined),
    optionalJson<MarketTrendIndex>(includeTrend ? trendPath : undefined)
  ]);
  signal?.throwIfAborted();
  const matchingStatus = status?.activeLeague && status.activeLeague.id !== selectedLeagueId ? null : status;
  const matchingTrend = trend && trend.league?.id !== selectedLeagueId ? null : trend;

  if (preferredLeagueId !== selectedLeagueId) {
    const preferences = loadSitePreferences();
    if (preferences.selectedLeagueId === preferredLeagueId) {
      saveSitePreferences({ ...preferences, selectedLeagueId });
    }
  }
  return { manifest, snapshot, status: matchingStatus, trend: matchingTrend, selectedLeagueId };
}
