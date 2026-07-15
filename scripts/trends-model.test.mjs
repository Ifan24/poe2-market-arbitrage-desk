import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MARKET_FILTERS } from "../lib/market-arbitrage.ts";
import { decodeTrendRouteKey, encodeTrendRouteKey, getTrendRouteHref } from "../lib/trend-route-links.ts";
import { buildTrendRows, filterTrendRows, getTrendCategories, getTrendRouteInsights, getTrendRouteRow } from "../lib/trends-model.ts";

function state() {
  return {
    items: [
      { id: "cur-exalted-orb", name: "Exalted Orb", category: "currency" },
      { id: "cur-divine-orb", name: "Divine Orb", category: "currency" },
      { id: "target-alloy", name: "Sovereign Alloy", category: "target", tag: "Expedition" },
      { id: "target-omen", name: "Omen of Testing", category: "target", tag: "Omens" },
      { id: "target-spike", name: "Impossible Spike", category: "target", tag: "Omens" }
    ],
    targets: [
      {
        id: "row-alloy",
        itemId: "target-alloy",
        tag: "Expedition",
        rates: { "cur-exalted-orb": "50", "cur-divine-orb": "1" },
        valueTradedExalted: 10000,
        highestStock: 500,
        priceExaltedByCurrency: { "cur-exalted-orb": "50", "cur-divine-orb": "100" }
      },
      {
        id: "row-omen",
        itemId: "target-omen",
        tag: "Omens",
        rates: { "cur-exalted-orb": "40", "cur-divine-orb": "0.8" },
        valueTradedExalted: 8000,
        highestStock: 400,
        priceExaltedByCurrency: { "cur-exalted-orb": "40", "cur-divine-orb": "80" }
      },
      {
        id: "row-spike",
        itemId: "target-spike",
        tag: "Omens",
        rates: { "cur-exalted-orb": "1", "cur-divine-orb": "1" },
        valueTradedExalted: 10000,
        highestStock: 500,
        priceExaltedByCurrency: { "cur-exalted-orb": "50", "cur-divine-orb": "100" }
      }
    ],
    pairs: [
      {
        id: "pair-divine-exalted",
        baseItemId: "cur-divine-orb",
        quoteItemId: "cur-exalted-orb",
        rate: "100"
      }
    ]
  };
}

function trendIndex() {
  return {
    schemaVersion: 1,
    league: { id: "runes", name: "Runes of Aldur" },
    generatedAt: "2026-07-04T10:00:00.000Z",
    windows: ["24h", "7d"],
    routeCount: 3,
    sampleCount: 8,
    routes: {
      "target-alloy|cur-exalted-orb|cur-divine-orb": {
        key: "target-alloy|cur-exalted-orb|cur-divine-orb",
        targetItemId: "target-alloy",
        buyCurrencyId: "cur-exalted-orb",
        sellCurrencyId: "cur-divine-orb",
        currentRoiPercent: 100,
        currentVolume: 1000,
        roiSeries: [
          { at: "2026-07-04T09:00:00.000Z", roi: -20, volume: 1000 },
          { at: "2026-07-04T10:00:00.000Z", roi: 100, volume: 1000 }
        ],
        profitPersistence: {
          "24h": { profitableSamples: 7, totalSamples: 8, percent: 87.5 },
          "7d": { profitableSamples: 7, totalSamples: 8, percent: 87.5 }
        }
      },
      "target-omen|cur-exalted-orb|cur-divine-orb": {
        key: "target-omen|cur-exalted-orb|cur-divine-orb",
        targetItemId: "target-omen",
        buyCurrencyId: "cur-exalted-orb",
        sellCurrencyId: "cur-divine-orb",
        currentRoiPercent: 100,
        currentVolume: 800,
        roiSeries: [
          { at: "2026-07-04T09:00:00.000Z", roi: 25, volume: 800 },
          { at: "2026-07-04T10:00:00.000Z", roi: 100, volume: 800 }
        ],
        profitPersistence: {
          "24h": { profitableSamples: 2, totalSamples: 8, percent: 25 },
          "7d": { profitableSamples: 2, totalSamples: 8, percent: 25 }
        }
      },
      "target-spike|cur-exalted-orb|cur-divine-orb": {
        key: "target-spike|cur-exalted-orb|cur-divine-orb",
        targetItemId: "target-spike",
        buyCurrencyId: "cur-exalted-orb",
        sellCurrencyId: "cur-divine-orb",
        currentRoiPercent: 9900,
        currentVolume: 10000,
        roiSeries: [
          { at: "2026-07-04T09:00:00.000Z", roi: 9900, volume: 10000 },
          { at: "2026-07-04T10:00:00.000Z", roi: 9900, volume: 10000 }
        ],
        profitPersistence: {
          "24h": { profitableSamples: 8, totalSamples: 8, percent: 100 },
          "7d": { profitableSamples: 8, totalSamples: 8, percent: 100 }
        }
      }
    }
  };
}

test("trends model matches routes by target item and currency ids", () => {
  const rows = buildTrendRows(state(), trendIndex());

  assert.equal(rows[0].key, "target-alloy|cur-exalted-orb|cur-divine-orb");
  assert.equal(rows[0].roiSeries.length, 2);
  assert.equal(rows[0].persistence24h.percent, 87.5);
  assert.equal(rows[1].key, "target-omen|cur-exalted-orb|cur-divine-orb");
});

test("trends model applies realistic market filters before ranking", () => {
  const rows = buildTrendRows(state(), trendIndex());

  assert.equal(rows.some((row) => row.item.name === "Impossible Spike"), false);
});

test("trends model can include edge routes when market filters are loosened", () => {
  const rows = buildTrendRows(state(), trendIndex(), {
    ...DEFAULT_MARKET_FILTERS,
    minPriceExalted: "0",
    maxRoiPercent: "10000"
  });

  assert.equal(rows.some((row) => row.item.name === "Impossible Spike"), true);
});

test("trends model keeps current routes when trend index is missing", () => {
  const rows = buildTrendRows(state(), null);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].persistence24h, null);
  assert.equal(rows[0].persistence7d, null);
});

test("trends model can select one route by stable route key", () => {
  const row = getTrendRouteRow(state(), trendIndex(), "target-alloy|cur-exalted-orb|cur-divine-orb");

  assert.equal(row?.item.name, "Sovereign Alloy");
  assert.equal(row?.mode.buyCurrencyName, "Exalted Orb");
  assert.equal(row?.mode.sellCurrencyName, "Divine Orb");
});

test("trend route detail lookup is not hidden by the ranked-list market filters", () => {
  const row = getTrendRouteRow(state(), trendIndex(), "target-spike|cur-exalted-orb|cur-divine-orb");

  assert.equal(buildTrendRows(state(), trendIndex()).some((candidate) => candidate.key === row?.key), false);
  assert.equal(row?.item.name, "Impossible Spike");
  assert.equal(row?.result.roi, 9900);
});

test("trend route links preserve route keys as one path segment", () => {
  const routeKey = "target-alloy|cur-exalted-orb|cur-divine-orb";
  const encoded = encodeTrendRouteKey(routeKey);

  assert.equal(encoded, "target-alloy%7Ccur-exalted-orb%7Ccur-divine-orb");
  assert.equal(decodeTrendRouteKey(encoded), routeKey);
  assert.equal(getTrendRouteHref("zh-TW", routeKey), "/cn/routes/target-alloy%7Ccur-exalted-orb%7Ccur-divine-orb");
});

test("trends model default filters keep rows without confidence data", () => {
  const filtered = filterTrendRows(
    buildTrendRows(state(), null),
    {
      query: "",
      category: "all",
      minSamples: 0,
      minPersistence24h: 0,
      minPersistence7d: 0
    },
    (item) => item.name,
    (tag) => tag || ""
  );

  assert.equal(filtered.length, 2);
});

test("trends model filters by category, samples, persistence, and search", () => {
  const rows = buildTrendRows(state(), trendIndex());
  const filtered = filterTrendRows(
    rows,
    {
      query: "alloy",
      category: "Expedition",
      minSamples: 8,
      minPersistence24h: 80,
      minPersistence7d: 80
    },
    (item) => item.name,
    (tag) => tag || ""
  );

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].item.name, "Sovereign Alloy");
});

test("trends model exposes available categories", () => {
  assert.deepEqual(getTrendCategories(buildTrendRows(state(), trendIndex())), ["Expedition", "Omens"]);
});

test("trends model selects focused route insights from filtered rows", () => {
  const rows = buildTrendRows(state(), trendIndex(), {
    ...DEFAULT_MARKET_FILTERS,
    minPriceExalted: "0",
    maxRoiPercent: "10000"
  });
  const insights = getTrendRouteInsights(rows);

  assert.deepEqual(insights.map((insight) => insight.kind), ["consistent", "improving", "liquid"]);
  assert.equal(new Set(insights.map((insight) => insight.row.key)).size, 3);
  assert.equal(insights[0].row.item.name, "Impossible Spike");
  assert.equal(insights[1].row.item.name, "Sovereign Alloy");
  assert.equal(insights[1].delta, 120);
});
