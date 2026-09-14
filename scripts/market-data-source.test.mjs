import test from "node:test";
import assert from "node:assert/strict";

import { getMarketDataSourceConfig } from "../lib/market-data-source.ts";
import { loadMarketDataBundle, resolveSelectedLeagueId } from "../lib/market-data-client.ts";

test("market data source defaults local and production to the public R2 data plane", () => {
  assert.deepEqual(
    getMarketDataSourceConfig({
      NODE_ENV: "development"
    }),
    {
      baseUrl: "https://data.poe2marketdesk.com",
      manifestPath: "/manifest.json",
      statusPath: "/status.json",
      trendIndexPath: "/trend-index.json",
      requireRemote: true
    }
  );
});

test("market data source still accepts explicit public data host overrides", () => {
  assert.deepEqual(
    getMarketDataSourceConfig({
      NODE_ENV: "development",
      NEXT_PUBLIC_MARKET_DATA_BASE_URL: "https://data.example.com/",
      NEXT_PUBLIC_MARKET_DATA_MANIFEST_PATH: "custom-manifest.json",
      NEXT_PUBLIC_MARKET_DATA_STATUS_PATH: "status/custom.json",
      NEXT_PUBLIC_MARKET_TREND_INDEX_PATH: "analytics/trends.json"
    }),
    {
      baseUrl: "https://data.example.com",
      manifestPath: "/custom-manifest.json",
      statusPath: "/status/custom.json",
      trendIndexPath: "/analytics/trends.json",
      requireRemote: true
    }
  );
});

test("league selection rejects expired and hardcore preferences while preserving a live softcore choice", () => {
  const root = {
    activeLeague: { id: "forbiddenrites", name: "Forbidden Rites", hardcore: false },
    defaultLeagueId: "forbiddenrites",
    availableLeagues: [
      { id: "forbiddenrites", name: "Forbidden Rites", hardcore: false, manifest: { url: "/leagues/forbiddenrites/manifest.json" } },
      { id: "runes", name: "Runes of Aldur", hardcore: false, manifest: { url: "/leagues/runes/manifest.json" } },
      { id: "hardcore", name: "Hardcore", hardcore: true, manifest: { url: "/leagues/hardcore/manifest.json" } }
    ]
  };
  assert.equal(resolveSelectedLeagueId(root, "runes"), "runes");
  assert.equal(resolveSelectedLeagueId(root, "expired"), "forbiddenrites");
  assert.equal(resolveSelectedLeagueId(root, "hardcore"), "forbiddenrites");
  assert.equal(resolveSelectedLeagueId(root, ""), "forbiddenrites");
});

test("legacy single-league manifests replace saved choices with their active league", () => {
  const legacy = { activeLeague: { id: "runes", name: "Runes of Aldur", hardcore: false } };
  assert.equal(resolveSelectedLeagueId(legacy, "forbiddenrites"), "runes");
});

const bundleSource = {
  baseUrl: "https://data.example.com",
  manifestPath: "/manifest.json",
  statusPath: "/status.json",
  trendIndexPath: "/trend-index.json"
};

function mockArtifacts(t, artifacts) {
  const requested = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requested.push(new URL(url).pathname);
    options.signal?.throwIfAborted();
    const artifact = artifacts[new URL(url).pathname];
    return artifact === undefined
      ? new Response(null, { status: 404 })
      : Response.json(artifact);
  });
  return requested;
}

test("selected non-default league loads only its scoped snapshot and auxiliary artifacts", async (t) => {
  const snapshot = { league: { id: "runes" }, items: [] };
  const status = { activeLeague: { id: "runes" } };
  const trend = { league: { id: "runes" }, items: [] };
  const requested = mockArtifacts(t, {
    "/manifest.json": {
      activeLeague: { id: "forbiddenrites" },
      availableLeagues: [{ id: "runes", hardcore: false, manifest: { url: "/leagues/runes/manifest.json" } }]
    },
    "/leagues/runes/manifest.json": {
      activeLeague: { id: "runes" },
      snapshot: { url: "/leagues/runes/snapshot.json" },
      status: { url: "/leagues/runes/status.json" },
      trendIndex: { url: "/leagues/runes/trend-index.json" }
    },
    "/leagues/runes/snapshot.json": snapshot,
    "/leagues/runes/status.json": status,
    "/leagues/runes/trend-index.json": trend
  });
  const bundle = await loadMarketDataBundle(bundleSource, {
    preferredLeagueId: "runes", includeStatus: true, includeTrend: true
  });
  assert.deepEqual(bundle.snapshot, snapshot);
  assert.deepEqual(bundle.status, status);
  assert.deepEqual(bundle.trend, trend);
  assert.deepEqual(requested, [
    "/manifest.json", "/leagues/runes/manifest.json", "/leagues/runes/snapshot.json",
    "/leagues/runes/status.json", "/leagues/runes/trend-index.json"
  ]);
});

test("legacy cache mixtures retain the snapshot but discard cross-league auxiliary data", async (t) => {
  const snapshot = { league: { id: "runes" }, items: [] };
  mockArtifacts(t, {
    "/manifest.json": { activeLeague: { id: "runes" }, snapshot: { url: "/snapshot.json" } },
    "/snapshot.json": snapshot,
    "/status.json": { activeLeague: { id: "forbiddenrites" } },
    "/trend-index.json": { league: { id: "forbiddenrites" } }
  });
  const bundle = await loadMarketDataBundle(bundleSource, {
    preferredLeagueId: "runes", includeStatus: true, includeTrend: true
  });
  assert.deepEqual(bundle.snapshot, snapshot);
  assert.equal(bundle.status, null);
  assert.equal(bundle.trend, null);
});

test("missing optional artifacts do not prevent loading the selected snapshot", async (t) => {
  const snapshot = { league: { id: "runes" }, items: [] };
  mockArtifacts(t, {
    "/manifest.json": { activeLeague: { id: "runes" }, snapshot: { url: "/snapshot.json" } },
    "/snapshot.json": snapshot
  });
  const bundle = await loadMarketDataBundle(bundleSource, {
    preferredLeagueId: "runes", includeStatus: true, includeTrend: true
  });
  assert.deepEqual(bundle.snapshot, snapshot);
  assert.equal(bundle.status, null);
  assert.equal(bundle.trend, null);
});

test("legacy status without a league remains usable", async (t) => {
  const status = { state: "ready" };
  mockArtifacts(t, {
    "/manifest.json": { activeLeague: { id: "runes" }, snapshot: { url: "/snapshot.json" } },
    "/snapshot.json": { league: { id: "runes" } },
    "/status.json": status
  });
  const bundle = await loadMarketDataBundle(bundleSource, { preferredLeagueId: "runes", includeStatus: true });
  assert.deepEqual(bundle.status, status);
});

test("an abort during an optional artifact fetch rejects the entire bundle", async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async (url) => {
    switch (new URL(url).pathname) {
      case "/manifest.json":
        return Response.json({ activeLeague: { id: "runes" }, snapshot: { url: "/snapshot.json" } });
      case "/snapshot.json":
        return Response.json({ league: { id: "runes" } });
      default:
        controller.abort();
        throw controller.signal.reason;
    }
  });
  await assert.rejects(loadMarketDataBundle(bundleSource, {
    preferredLeagueId: "runes", includeStatus: true, signal: controller.signal
  }), { name: "AbortError" });
});
