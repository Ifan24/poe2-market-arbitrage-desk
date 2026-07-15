import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPairRates,
  buildTopOpportunities,
  createMarketSnapshot
} from "../lib/market-snapshot.mjs";

const rows = [
  {
    poeId: "omen",
    detailsId: "omen",
    name: "Test Omen",
    category: "Omens",
    categoryUrl: "omens",
    volume: 1000,
    valueTradedExalted: 1000,
    highestStock: 250,
    maxVolumeCurrency: "Exalted Orb",
    rates: {
      "Exalted Orb": 40,
      "Divine Orb": 0.5
    },
    priceExaltedByCurrency: {
      "Exalted Orb": 40,
      "Divine Orb": 50
    }
  }
];

test("market snapshot builder shapes shared dashboard data", () => {
  const pairRates = buildPairRates({
    "Divine Orb": 1,
    "Chaos Orb": 10,
    "Exalted Orb": 100,
    chaosToExalted: 10
  });
  const topOpportunities = buildTopOpportunities(rows, pairRates, {
    minTradeValueDivine: 1,
    minStock: 100,
    minPriceExalted: 20,
    maxPriceExalted: 100,
    minRoiPercent: 1,
    maxRoiPercent: 200
  }, { "Exalted Orb": 100 });
  const snapshot = createMarketSnapshot({
    rows,
    pairRates,
    league: "test",
    source: "fixture",
    importedFrom: "fixture import",
    topOpportunities
  });

  assert.equal(snapshot.state.items.some((item) => item.id === "cur-divine-orb"), true);
  assert.equal(snapshot.state.targets[0].rates["cur-exalted-orb"], "40");
  assert.equal(snapshot.state.targets[0].priceExaltedByCurrency["cur-divine-orb"], "50");
  assert.equal(snapshot.state.pairs.length, 3);
  assert.equal(snapshot.topOpportunities[0].buyCurrency, "Exalted Orb");
  assert.equal(snapshot.topOpportunities[0].sellCurrency, "Divine Orb");
});

test("market snapshot preserves single-rate store value assets without arbitrage routes", () => {
  const pairRates = buildPairRates({
    "Divine Orb": 1,
    "Chaos Orb": 10,
    "Exalted Orb": 100,
    chaosToExalted: 10
  });
  const storeValueRows = [
    {
      poeId: "mirror",
      detailsId: "mirror",
      name: "Mirror of Kalandra",
      category: "Currency",
      categoryUrl: "currency",
      volume: 186568086,
      valueTradedExalted: 186568086,
      highestStock: 16,
      maxVolumeCurrency: "Divine Orb",
      rates: {
        "Divine Orb": 7221
      },
      priceExaltedByCurrency: {
        "Divine Orb": 722100
      }
    }
  ];
  const topOpportunities = buildTopOpportunities(storeValueRows, pairRates, {
    minTradeValueDivine: 1,
    minStock: 1,
    minPriceExalted: 20,
    maxPriceExalted: 1000000,
    minRoiPercent: 1,
    maxRoiPercent: 200
  }, { "Exalted Orb": 100 });
  const snapshot = createMarketSnapshot({
    rows: storeValueRows,
    pairRates,
    league: "test",
    source: "fixture",
    importedFrom: "fixture import",
    topOpportunities
  });

  assert.equal(snapshot.state.items[3].name, "Mirror of Kalandra [Currency]");
  assert.deepEqual(snapshot.state.targets[0].rates, { "cur-divine-orb": "7221" });
  assert.deepEqual(snapshot.topOpportunities, []);
});
