import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MARKET_FILTERS,
  filterTargetResults,
  getBestBuyCurrencyOptions,
  getBestSellCurrencyOptions,
  getCurrencyModes,
  getDefaultPlannerValues,
  getManualPlannerResult,
  getPreferredModeKey,
  getTargetResults,
  sortTargetResults
} from "../lib/market-arbitrage.ts";

const state = {
  items: [
    { id: "cur-exalted-orb", name: "Exalted Orb", category: "currency", goldCost: "0" },
    { id: "cur-divine-orb", name: "Divine Orb", category: "currency", goldCost: "0" },
    { id: "target-omen", name: "Test Omen [Omens]", category: "target", tag: "Omens", volume: "10k", goldCost: "20" }
  ],
  pairs: [
    { id: "pair-ex-div", baseItemId: "cur-divine-orb", quoteItemId: "cur-exalted-orb", rate: "100" }
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
        "cur-divine-orb": "50"
      },
      rates: {
        "cur-exalted-orb": "40",
        "cur-divine-orb": "0.5"
      }
    }
  ]
};

test("market arbitrage ranks and filters route results through one interface", () => {
  const routeKey = getPreferredModeKey(state.items, state.pairs);
  assert.equal(routeKey, "cur-exalted-orb|cur-divine-orb");

  const route = getCurrencyModes(state.items, state.pairs).find((mode) => mode.key === routeKey);
  const results = getTargetResults(state, route);

  assert.equal(results.length, 1);
  assert.equal(results[0].buyPrice, 40);
  assert.equal(results[0].sellPrice, 0.5);
  assert.equal(results[0].sellToBuyRate, 100);
  assert.equal(results[0].revenue, 50);
  assert.equal(results[0].roi, 25);
  assert.equal(results[0].netProfitInDivine, 0.1);
  assert.equal(results[0].goldPerDivineProfit, 200);

  const filtered = filterTargetResults(results, {
    query: "omen",
    favoriteSet: new Set(),
    selectedTag: "all",
    favoritesOnly: false,
    marketFilters: DEFAULT_MARKET_FILTERS,
    pairs: state.pairs,
    formatItemName: (item) => item.name,
    formatTag: (tag) => tag || ""
  });
  assert.equal(filtered.length, 1);
  assert.equal(sortTargetResults(filtered, "profit", (item) => item.name)[0].item.id, "target-omen");
});

test("gold efficiency uses Divine profit even when sell currency is not Divine", () => {
  const nonDivineSellState = {
    ...state,
    targets: [
      {
        ...state.targets[0],
        priceExaltedByCurrency: {
          "cur-exalted-orb": "50",
          "cur-divine-orb": "40"
        },
        rates: {
          "cur-exalted-orb": "50",
          "cur-divine-orb": "0.4"
        }
      }
    ]
  };
  const route = getCurrencyModes(nonDivineSellState.items, nonDivineSellState.pairs).find(
    (mode) => mode.key === "cur-divine-orb|cur-exalted-orb"
  );
  const [result] = getTargetResults(nonDivineSellState, route);

  assert.equal(route.sellCurrencyName, "Exalted Orb");
  assert.equal(result.netProfitInBuyCurrency, 0.09999999999999998);
  assert.equal(result.netProfitInDivine, 0.09999999999999998);
  assert.equal(Math.round(result.goldPerDivineProfit), 200);
});

test("currency modes sort Exalted buy-side routes first", () => {
  const threeCurrencyState = {
    ...state,
    items: [
      ...state.items,
      { id: "cur-chaos-orb", name: "Chaos Orb", category: "currency", goldCost: "0" }
    ],
    pairs: [
      ...state.pairs,
      { id: "pair-ex-chaos", baseItemId: "cur-exalted-orb", quoteItemId: "cur-chaos-orb", rate: "10" },
      { id: "pair-div-chaos", baseItemId: "cur-divine-orb", quoteItemId: "cur-chaos-orb", rate: "100" }
    ]
  };
  const modes = getCurrencyModes(threeCurrencyState.items, threeCurrencyState.pairs);

  assert.equal(modes.length, 6);
  assert.deepEqual(
    modes.slice(0, 2).map((mode) => mode.buyCurrencyName),
    ["Exalted Orb", "Exalted Orb"]
  );
});

test("best buy currency options rank normalized costs and keep missing conversions", () => {
  const bestBuyState = {
    ...state,
    items: [
      ...state.items,
      { id: "cur-chaos-orb", name: "Chaos Orb", category: "currency", goldCost: "0" }
    ],
    targets: [
      {
        ...state.targets[0],
        rates: {
          "cur-exalted-orb": "40",
          "cur-divine-orb": "0.5",
          "cur-chaos-orb": "100"
        }
      }
    ]
  };
  const options = getBestBuyCurrencyOptions(bestBuyState, "target-omen");

  assert.equal(options.length, 3);
  assert.equal(options[0].currencyName, "Exalted Orb");
  assert.equal(options[0].normalizedAmount, 40);
  assert.equal(options[0].isBest, true);
  assert.equal(options[1].currencyName, "Divine Orb");
  assert.equal(options[1].normalizedAmount, 50);
  assert.equal(options[2].currencyName, "Chaos Orb");
  assert.equal(options[2].normalizedAmount, null);
  assert.equal(options[2].missingConversion, true);
});

test("best sell currency options rank highest normalized Exalted value", () => {
  const bestSellState = {
    ...state,
    items: [
      ...state.items,
      { id: "cur-chaos-orb", name: "Chaos Orb", category: "currency", goldCost: "0" }
    ],
    targets: [
      {
        ...state.targets[0],
        rates: {
          "cur-exalted-orb": "40",
          "cur-divine-orb": "0.5",
          "cur-chaos-orb": "100"
        }
      }
    ]
  };
  const options = getBestSellCurrencyOptions(bestSellState, "target-omen");

  assert.equal(options.length, 3);
  assert.equal(options[0].currencyName, "Divine Orb");
  assert.equal(options[0].normalizedAmount, 50);
  assert.equal(options[0].isBest, true);
  assert.equal(options[1].currencyName, "Exalted Orb");
  assert.equal(options[1].normalizedAmount, 40);
  assert.equal(options[2].currencyName, "Chaos Orb");
  assert.equal(options[2].normalizedAmount, null);
});

test("market planner derives paired trade values from snapshot rates", () => {
  const route = getCurrencyModes(state.items, state.pairs).find((mode) => mode.key === "cur-exalted-orb|cur-divine-orb");
  const [result] = getTargetResults(state, route);
  const defaults = getDefaultPlannerValues(result);
  const manual = getManualPlannerResult(defaults, result);

  assert.ok(Number(defaults.buyPayAmount) > 0);
  assert.equal(manual.buyRate, result.buyPrice);
  assert.equal(manual.sellRate, result.sellPrice);
  assert.equal(manual.roi, result.roi);
  assert.equal(manual.batchProfit, manual.profitPerItem * Number(defaults.sellItemCount));
});
