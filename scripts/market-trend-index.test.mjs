import test from "node:test";
import assert from "node:assert/strict";
import { buildMarketTrendIndex } from "../lib/market-trend-index.ts";

const ROUTE_KEY = "target-sovereign-alloy|cur-exalted-orb|cur-divine-orb";

function snapshot({ importedAt, sellDivineRate, targetId = "row-sovereign-alloy", includeTarget = true }) {
  return {
    league: "Runes of Aldur",
    state: {
      importedAt,
      items: [
        { id: "cur-exalted-orb", name: "Exalted Orb", category: "currency" },
        { id: "cur-divine-orb", name: "Divine Orb", category: "currency" },
        { id: "target-sovereign-alloy", name: "Sovereign Alloy", category: "target" }
      ],
      targets: includeTarget
        ? [
            {
              id: targetId,
              itemId: "target-sovereign-alloy",
              rates: {
                "cur-exalted-orb": "50",
                "cur-divine-orb": String(sellDivineRate)
              },
              valueTradedExalted: 1000,
              highestStock: 500,
              priceExaltedByCurrency: {
                "cur-exalted-orb": "50",
                "cur-divine-orb": String(sellDivineRate * 100)
              }
            }
          ]
        : [],
      pairs: [
        {
          id: "pair-divine-exalted",
          baseItemId: "cur-divine-orb",
          quoteItemId: "cur-exalted-orb",
          rate: "100"
        }
      ]
    }
  };
}

test("market trend index records positive persistence and one-hour spikes", () => {
  const index = buildMarketTrendIndex({
    league: { id: "runes", name: "Runes of Aldur" },
    snapshots: [
      snapshot({ importedAt: "2026-07-04T09:00:00.000Z", sellDivineRate: 0.4 }),
      snapshot({ importedAt: "2026-07-04T10:00:00.000Z", sellDivineRate: 1 })
    ]
  });

  assert.equal(index.schemaVersion, 1);
  assert.equal(index.league.id, "runes");
  assert.equal(index.sampleCount, 2);
  assert.equal(index.routeCount, 1);
  assert.equal(index.routes[ROUTE_KEY].currentRoiPercent, 100);
  assert.deepEqual(index.routes[ROUTE_KEY].roiSeries, [
    { at: "2026-07-04T09:00:00.000Z", roi: -20, volume: 1000 },
    { at: "2026-07-04T10:00:00.000Z", roi: 100, volume: 1000 }
  ]);
  assert.deepEqual(index.routes[ROUTE_KEY].profitPersistence["24h"], {
    profitableSamples: 1,
    totalSamples: 2,
    percent: 50
  });
});

test("market trend index tolerates missing snapshots as gaps", () => {
  const index = buildMarketTrendIndex({
    league: { id: "runes", name: "Runes of Aldur" },
    snapshots: [
      snapshot({ importedAt: "2026-07-04T08:00:00.000Z", sellDivineRate: 1, includeTarget: false }),
      snapshot({ importedAt: "2026-07-04T09:00:00.000Z", sellDivineRate: 0.4 }),
      snapshot({ importedAt: "2026-07-04T10:00:00.000Z", sellDivineRate: 1 })
    ]
  });

  assert.equal(index.sampleCount, 3);
  assert.deepEqual(index.routes[ROUTE_KEY].profitPersistence["24h"], {
    profitableSamples: 1,
    totalSamples: 2,
    percent: 50
  });
});

test("market trend index keeps route identity stable when provider row ids change", () => {
  const index = buildMarketTrendIndex({
    league: { id: "runes", name: "Runes of Aldur" },
    snapshots: [
      snapshot({
        importedAt: "2026-07-04T09:00:00.000Z",
        sellDivineRate: 1,
        targetId: "row-sovereign-alloy-old"
      }),
      snapshot({
        importedAt: "2026-07-04T10:00:00.000Z",
        sellDivineRate: 1,
        targetId: "row-sovereign-alloy-new"
      })
    ]
  });

  assert.equal(index.routes[ROUTE_KEY].targetItemId, "target-sovereign-alloy");
  assert.deepEqual(index.routes[ROUTE_KEY].profitPersistence["7d"], {
    profitableSamples: 2,
    totalSamples: 2,
    percent: 100
  });
});

test("market trend index windows exclude old samples", () => {
  const index = buildMarketTrendIndex({
    league: { id: "runes", name: "Runes of Aldur" },
    snapshots: [
      snapshot({ importedAt: "2026-06-26T10:00:00.000Z", sellDivineRate: 1 }),
      snapshot({ importedAt: "2026-07-03T09:00:00.000Z", sellDivineRate: 0.4 }),
      snapshot({ importedAt: "2026-07-04T10:00:00.000Z", sellDivineRate: 1 })
    ]
  });

  assert.deepEqual(index.routes[ROUTE_KEY].profitPersistence["24h"], {
    profitableSamples: 1,
    totalSamples: 1,
    percent: 100
  });
  assert.deepEqual(index.routes[ROUTE_KEY].profitPersistence["7d"], {
    profitableSamples: 1,
    totalSamples: 2,
    percent: 50
  });
});
