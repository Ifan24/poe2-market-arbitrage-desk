import test from "node:test";
import assert from "node:assert/strict";
import { createMarketBaseline } from "./update-market-baseline.mjs";
import { toMarketDataShell } from "../lib/market-data.ts";

test("market baseline keeps snapshot data but marks itself as baseline", () => {
  const snapshot = {
    league: "Runes of Aldur",
    source: "poe2scout",
    state: {
      importedAt: "2026-07-04T07:00:00.000Z",
      items: [],
      targets: [],
      pairs: []
    }
  };

  const baseline = createMarketBaseline(snapshot);

  assert.equal(baseline.schemaVersion, 1);
  assert.equal(baseline.role, "baseline");
  assert.equal(baseline.generatedAt, "2026-07-04T07:00:00.000Z");
  assert.equal(baseline.league, "Runes of Aldur");
  assert.equal(baseline.state, snapshot.state);
});

test("market data shell keeps metadata without carrying full baseline tables", () => {
  const shell = toMarketDataShell({
    schemaVersion: 1,
    role: "baseline",
    generatedAt: "2026-07-04T07:00:00.000Z",
    league: "Runes of Aldur",
    state: {
      importedAt: "2026-07-04T07:00:00.000Z",
      items: [{ id: "cur-exalted-orb", name: "Exalted Orb", category: "currency" }],
      targets: [{ id: "target", itemId: "target", rates: {} }],
      pairs: [{ id: "pair", baseItemId: "a", quoteItemId: "b", rate: "1" }]
    }
  });

  assert.equal(shell.role, "baseline");
  assert.equal(shell.league, "Runes of Aldur");
  assert.equal(shell.state.importedAt, "2026-07-04T07:00:00.000Z");
  assert.deepEqual(shell.state.items, []);
  assert.deepEqual(shell.state.targets, []);
  assert.deepEqual(shell.state.pairs, []);
});
