import test from "node:test";
import assert from "node:assert/strict";

import { buildMarketAppreciationIndex } from "../lib/market-appreciation-index.ts";

function snapshot({
  importedAt,
  mirrorPrice,
  lockPrice,
  volatilePrice,
  thinPrice,
  includeLock = true
}) {
  const targets = [
    target("target-mirror", "Mirror Shard", "Fragments", mirrorPrice, 100000, 30),
    target("target-volatile", "Volatile Relic", "Relics", volatilePrice, 50000, 20),
    target("target-thin", "Thin Crown", "Uniques", thinPrice, 10, 1)
  ];

  if (includeLock) {
    targets.push(target("target-lock", "Time-Lost Lock", "Omens", lockPrice, 25000, 12));
  }

  return {
    league: "Runes of Aldur",
    state: {
      importedAt,
      items: [
        { id: "cur-divine-orb", name: "Divine Orb", category: "currency" },
        { id: "cur-exalted-orb", name: "Exalted Orb", category: "currency" },
        { id: "target-mirror", name: "Mirror Shard", category: "target", tag: "Fragments" },
        { id: "target-lock", name: "Time-Lost Lock", category: "target", tag: "Omens" },
        { id: "target-volatile", name: "Volatile Relic", category: "target", tag: "Relics" },
        { id: "target-thin", name: "Thin Crown", category: "target", tag: "Uniques" },
        { id: "target-cheap", name: "Cheap Fossil", category: "target", tag: "Crafting" }
      ],
      targets: [
        ...targets,
        target("target-cheap", "Cheap Fossil", "Crafting", 0.1, 30000, 100)
      ],
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

function target(itemId, name, tag, priceDivine, volume, stock) {
  return {
    id: `row-${itemId}`,
    itemId,
    tag,
    rates: {
      "cur-divine-orb": String(priceDivine),
      "cur-exalted-orb": String(priceDivine * 100)
    },
    valueTradedExalted: volume,
    highestStock: stock,
    priceExaltedByCurrency: {
      "cur-divine-orb": String(priceDivine * 100),
      "cur-exalted-orb": String(priceDivine * 100)
    }
  };
}

test("appreciation index ranks scarce assets by Divine-denominated growth signals", () => {
  const index = buildMarketAppreciationIndex({
    league: { id: "runes", name: "Runes of Aldur" },
    snapshots: [
      snapshot({ importedAt: "2026-07-04T00:00:00.000Z", mirrorPrice: 100, lockPrice: 20, volatilePrice: 40, thinPrice: 5 }),
      snapshot({ importedAt: "2026-07-04T06:00:00.000Z", mirrorPrice: 110, lockPrice: 20, volatilePrice: 80, thinPrice: 6 }),
      snapshot({ importedAt: "2026-07-04T12:00:00.000Z", mirrorPrice: 125, lockPrice: 21, volatilePrice: 20, thinPrice: 8 }),
      snapshot({ importedAt: "2026-07-04T18:00:00.000Z", mirrorPrice: 140, lockPrice: 21, volatilePrice: 90, thinPrice: 10 })
    ]
  });

  assert.equal(index.schemaVersion, 1);
  assert.equal(index.league.id, "runes");
  assert.equal(index.sampleCount, 4);
  assert.equal(index.assets["target-mirror"].signal, "rising");
  assert.equal(index.assets["target-mirror"].windows["7d"].changePercent, 40);
  assert.equal(index.assets["target-lock"].signal, "stable");
  assert.equal(index.assets["target-volatile"].signal, "volatile");
  assert.equal(index.assets["target-thin"].signal, "thin");
  assert.equal(index.assets["target-cheap"], undefined);
});

test("appreciation index treats missing history as a low-confidence thin signal", () => {
  const index = buildMarketAppreciationIndex({
    league: { id: "runes", name: "Runes of Aldur" },
    snapshots: [
      snapshot({
        importedAt: "2026-07-04T00:00:00.000Z",
        mirrorPrice: 100,
        lockPrice: 20,
        volatilePrice: 40,
        thinPrice: 5,
        includeLock: false
      }),
      snapshot({ importedAt: "2026-07-04T06:00:00.000Z", mirrorPrice: 110, lockPrice: 25, volatilePrice: 42, thinPrice: 5 })
    ]
  });

  assert.equal(index.assets["target-lock"].series.length, 1);
  assert.equal(index.assets["target-lock"].signal, "thin");
  assert.equal(index.assets["target-lock"].windows["7d"].changePercent, null);
});
