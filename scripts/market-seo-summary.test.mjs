import test from "node:test";
import assert from "node:assert/strict";
import { buildMarketSeoSummary } from "../lib/market-seo-summary.ts";

function marketData() {
  return {
    league: "Runes of Aldur",
    state: {
      importedAt: "2026-07-04T09:00:00.000Z",
      items: [
        { id: "cur-exalted-orb", name: "Exalted Orb", category: "currency" },
        { id: "cur-divine-orb", name: "Divine Orb", category: "currency" },
        { id: "target-alloy", name: "Sovereign Alloy [Expedition]", category: "target", tag: "Expedition" },
        { id: "target-rune", name: "Greater Rune of Alacrity [Runes]", category: "target", tag: "Runes" }
      ],
      pairs: [{ id: "pair-div-ex", baseItemId: "cur-divine-orb", quoteItemId: "cur-exalted-orb", rate: "120" }],
      targets: [
        {
          id: "target-alloy",
          itemId: "target-alloy",
          tag: "Expedition",
          valueTradedExalted: 5000,
          rates: {
            "cur-exalted-orb": "50",
            "cur-divine-orb": "0.75"
          }
        },
        {
          id: "target-rune",
          itemId: "target-rune",
          tag: "Runes",
          valueTradedExalted: 4000,
          rates: {
            "cur-exalted-orb": "80",
            "cur-divine-orb": "0.8"
          }
        }
      ]
    }
  };
}

test("market SEO summary derives compact route and category facts", () => {
  const summary = buildMarketSeoSummary(marketData(), {
    leagueId: "runes",
    maxRoutes: 1
  });

  assert.equal(summary.schemaVersion, 1);
  assert.equal(summary.league.id, "runes");
  assert.equal(summary.league.name, "Runes of Aldur");
  assert.equal(summary.generatedAt, "2026-07-04T09:00:00.000Z");
  assert.equal(summary.itemCount, 4);
  assert.equal(summary.targetCount, 2);
  assert.equal(summary.topRoutes.length, 1);
  assert.equal(summary.topRoutes[0].targetName, "Sovereign Alloy [Expedition]");
  assert.equal(summary.topRoutes[0].buyCurrency, "Exalted Orb");
  assert.equal(summary.topRoutes[0].sellCurrency, "Divine Orb");
  assert.equal(summary.topRoutes[0].roiPercent, 80);
  assert.deepEqual(summary.topCategories, [
    { name: "Expedition", targetCount: 1 },
    { name: "Runes", targetCount: 1 }
  ]);
});
