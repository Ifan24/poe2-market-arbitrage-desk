import test from "node:test";
import assert from "node:assert/strict";

import { POE2DB_CURRENCY_NAME_PAGES, buildCurrencyNameMap } from "./update-poe2db-currency-names.mjs";

test("currency-name generator uses the Traditional Chinese POE2DB route", () => {
  assert.equal(POE2DB_CURRENCY_NAME_PAGES["zh-TW"], "https://poe2db.tw/tw/Currency_Exchange");
});

test("currency-name generator pairs source and localized rows by exchange href key", () => {
  const sourceRows = [
    { name: "Exalted Orb", exchangeHrefKey: "Exalted_Orb" },
    { name: "Divine Orb", exchangeHrefKey: "Divine_Orb" }
  ];
  const localizedRows = [
    { name: "神のオーブ", exchangeHrefKey: "Divine_Orb" },
    { name: "高貴なオーブ", exchangeHrefKey: "Exalted_Orb" }
  ];

  const { names, diagnostics } = buildCurrencyNameMap(sourceRows, localizedRows);

  assert.deepEqual(names, {
    "Exalted Orb": "高貴なオーブ",
    "Divine Orb": "神のオーブ"
  });
  assert.equal(diagnostics.sourceCount, 2);
  assert.equal(diagnostics.localizedCount, 2);
  assert.equal(diagnostics.mappedCount, 2);
  assert.equal(diagnostics.localizedMappedCount, 2);
  assert.equal(diagnostics.fallbackCount, 0);
  assert.deepEqual(diagnostics.missing, []);
  assert.deepEqual(diagnostics.duplicateKeys, []);
});

test("currency-name generator reports English fallbacks separately from localized mappings", () => {
  const sourceRows = [
    { name: "Exalted Orb", exchangeHrefKey: "Exalted_Orb" },
    { name: "New Orb", exchangeHrefKey: "New_Orb" }
  ];
  const localizedRows = [{ name: "Orbe exaltado", exchangeHrefKey: "Exalted_Orb" }];

  const { names, diagnostics } = buildCurrencyNameMap(sourceRows, localizedRows);

  assert.deepEqual(names, {
    "Exalted Orb": "Orbe exaltado",
    "New Orb": "New Orb"
  });
  assert.equal(diagnostics.mappedCount, 2);
  assert.equal(diagnostics.localizedMappedCount, 1);
  assert.equal(diagnostics.fallbackCount, 1);
  assert.deepEqual(diagnostics.missing, ["New Orb"]);
});
