import test from "node:test";
import assert from "node:assert/strict";
import { buildDashboardModel } from "../lib/dashboard-model.ts";
import { DEFAULT_MARKET_FILTERS } from "../lib/market-arbitrage.ts";

const state = {
  items: [
    { id: "cur-exalted-orb", name: "Exalted Orb", category: "currency", goldCost: "0" },
    { id: "cur-divine-orb", name: "Divine Orb", category: "currency", goldCost: "0" },
    { id: "cur-chaos-orb", name: "Chaos Orb", category: "currency", goldCost: "0" },
    { id: "target-omen", name: "Test Omen [Omens]", category: "target", tag: "Omens", volume: "10k", goldCost: "20" },
    { id: "target-rune", name: "Test Rune [Runes]", category: "target", tag: "Runes", volume: "4k", goldCost: "10" }
  ],
  pairs: [
    { id: "pair-ex-div", baseItemId: "cur-divine-orb", quoteItemId: "cur-exalted-orb", rate: "100" },
    { id: "pair-ex-chaos", baseItemId: "cur-exalted-orb", quoteItemId: "cur-chaos-orb", rate: "10" },
    { id: "pair-div-chaos", baseItemId: "cur-divine-orb", quoteItemId: "cur-chaos-orb", rate: "1000" }
  ],
  targets: [
    {
      id: "row-omen",
      itemId: "target-omen",
      tag: "Omens",
      valueTradedExalted: 10000,
      highestStock: 500,
      priceExaltedByCurrency: {
        "cur-exalted-orb": "40",
        "cur-divine-orb": "50",
        "cur-chaos-orb": "45"
      },
      rates: {
        "cur-exalted-orb": "40",
        "cur-divine-orb": "0.5",
        "cur-chaos-orb": "450"
      }
    },
    {
      id: "row-rune",
      itemId: "target-rune",
      tag: "Runes",
      valueTradedExalted: 4000,
      highestStock: 300,
      priceExaltedByCurrency: {
        "cur-exalted-orb": "30",
        "cur-divine-orb": "35"
      },
      rates: {
        "cur-exalted-orb": "30",
        "cur-divine-orb": "0.35"
      }
    }
  ]
};

function buildModel(overrides = {}) {
  return buildDashboardModel({
    state,
    selectedModeKey: "all-routes",
    selectedTag: "all",
    selectedBestBuyItemId: "",
    bestCurrencySide: "buy",
    search: "",
    sortKey: "roi",
    favoritesOnly: false,
    favoriteItemIds: [],
    marketFilters: DEFAULT_MARKET_FILTERS,
    page: 1,
    pageSize: 2,
    allRouteKey: "all-routes",
    formatItemName: (item) => item.name,
    formatTag: (tag) => tag || "",
    ...overrides
  });
}

test("dashboard model derives route views, stats, overview, and pagination through one interface", () => {
  const model = buildModel();

  assert.equal(model.isAllRoutes, true);
  assert.equal(model.selectedMode, undefined);
  assert.equal(model.currencyModes.length, 6);
  assert.deepEqual(model.tags, ["Omens", "Runes"]);
  assert.equal(model.targetOptions[0].item.id, "target-omen");
  assert.equal(model.bestBuyItemId, "target-omen");
  assert.equal(model.routedResults.length > 2, true);
  assert.equal(model.pagedResults.length, 2);
  assert.equal(model.pageCount, Math.ceil(model.routedResults.length / 2));
  assert.equal(model.overviewResults.length, Math.min(6, model.routedResults.length));
  assert.equal(model.bestRoi, model.routedResults[0].result.roi);
  assert.equal(model.bestVolume, 10000);
});

test("dashboard model applies route, text, tag, favorites, and page normalization", () => {
  const model = buildModel({
    selectedModeKey: "cur-exalted-orb|cur-divine-orb",
    selectedTag: "Omens",
    search: "omen",
    favoritesOnly: true,
    favoriteItemIds: ["target-omen"],
    page: 99
  });

  assert.equal(model.selectedMode?.key, "cur-exalted-orb|cur-divine-orb");
  assert.equal(model.routedResults.length, 1);
  assert.equal(model.routedResults[0].result.item.id, "target-omen");
  assert.equal(model.pageCount, 1);
  assert.equal(model.normalizedPage, 1);
  assert.equal(model.pagedResults.length, 1);
});

test("dashboard model switches best currency side without formatting display rows", () => {
  const buyModel = buildModel({
    selectedBestBuyItemId: "target-omen",
    bestCurrencySide: "buy"
  });
  const sellModel = buildModel({
    selectedBestBuyItemId: "target-omen",
    bestCurrencySide: "sell"
  });

  assert.equal(buyModel.bestBuyCandidates[0].currencyName, "Exalted Orb");
  assert.equal(buyModel.bestBuyCandidates[0].isBest, true);
  assert.equal(sellModel.bestBuyCandidates[0].currencyName, "Divine Orb");
  assert.equal(sellModel.bestBuyCandidates[0].isBest, true);
  assert.equal(typeof sellModel.pagedResults[0].result.buyPrice, "number");
});
