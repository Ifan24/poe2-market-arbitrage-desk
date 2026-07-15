import test from "node:test";
import assert from "node:assert/strict";

import { buildAppreciationRows, filterAppreciationRows } from "../lib/appreciation-model.ts";

function asset({ itemId, name, signal, changePercent, confidence = 60, volume = 10000 }) {
  return {
    itemId,
    name,
    category: "target",
    tag: "Fragments",
    currentPriceDivine: 1,
    currentPriceExalted: 100,
    currentVolume: volume,
    currentStock: 10,
    signal,
    confidence,
    series: [],
    windows: {
      "24h": { samples: 2, changePercent, volatilityPercent: 1, maxDrawdownPercent: 0 },
      "7d": { samples: 2, changePercent, volatilityPercent: 1, maxDrawdownPercent: 0 }
    }
  };
}

test("appreciation model ranks rising assets before weaker signals", () => {
  const rows = buildAppreciationRows(
    {
      schemaVersion: 1,
      league: { id: "runes", name: "Runes of Aldur" },
      generatedAt: "2026-07-04T10:00:00.000Z",
      windows: ["24h", "7d"],
      assetCount: 3,
      sampleCount: 2,
      assets: {
        stable: asset({ itemId: "stable", name: "Stable Lock", signal: "stable", changePercent: 5 }),
        risingLow: asset({ itemId: "risingLow", name: "Rising Low", signal: "rising", changePercent: 12 }),
        risingHigh: asset({ itemId: "risingHigh", name: "Rising High", signal: "rising", changePercent: 25 })
      }
    },
    [{ id: "risingHigh", name: "Rising High", category: "target" }]
  );

  assert.deepEqual(rows.map((row) => row.key), ["risingHigh", "risingLow", "stable"]);
  assert.equal(rows[0].item?.name, "Rising High");
});

test("appreciation model filters by signal and text", () => {
  const rows = buildAppreciationRows(
    {
      schemaVersion: 1,
      league: { id: "runes", name: "Runes of Aldur" },
      generatedAt: "2026-07-04T10:00:00.000Z",
      windows: ["24h", "7d"],
      assetCount: 2,
      sampleCount: 2,
      assets: {
        mirror: asset({ itemId: "mirror", name: "Mirror Shard", signal: "rising", changePercent: 20 }),
        lock: asset({ itemId: "lock", name: "Time-Lost Lock", signal: "stable", changePercent: 2 })
      }
    },
    []
  );

  assert.deepEqual(filterAppreciationRows(rows, "mirror", "all").map((row) => row.key), ["mirror"]);
  assert.deepEqual(filterAppreciationRows(rows, "", "stable").map((row) => row.key), ["lock"]);
});
