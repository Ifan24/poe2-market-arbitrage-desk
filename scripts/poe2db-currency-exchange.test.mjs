import test from "node:test";
import assert from "node:assert/strict";
import {
  getLocalIconPath,
  normalizeExchangeHref,
  normalizeName,
  parseCurrencyExchangeRows,
  rowsToGoldCosts,
  rowsToIconSources
} from "../lib/poe2db-currency-exchange.mjs";

const fixture = `
<h4>Currency Exchange</h4>
<h5>Currency</h5>
<div class="col"><div class="d-flex border-top rounded"><div class="flex-shrink-0"><a href="Orb_of_Augmentation"><img loading="lazy" src="https://cdn.poe2db.tw/image/Art/2DItems/Currency/CurrencyAddModToMagic.webp" alt="CurrencyAddModToMagic" class="size32 w1" /></a></div><div class="flex-grow-1 ms-2 d-flex justify-content-between align-items-center"><a href="Orb_of_Augmentation">Orb of Augmentation</a><span>20</span></div></div></div>
<h5>Ritual</h5>
<div class="col"><div class="d-flex border-top rounded"><div class="flex-shrink-0"><a href="/us/Omen_of_Bartering"><img loading="lazy" src="https://cdn.poe2db.tw/image/Art/2DItems/Currency/Ritual/OmenVendorRefresh.webp" alt="OmenVendorRefresh" class="size32 w1" /></a></div><div class="flex-grow-1 ms-2 d-flex justify-content-between align-items-center"><a href="/us/Omen_of_Bartering">Omen of Bartering</a><span>1000</span></div></div></div>
<div class="card mb-1"></div>
`;

test("poe2db currency exchange parser extracts icon sources and gold costs", () => {
  const rows = parseCurrencyExchangeRows(fixture);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "Orb of Augmentation");
  assert.equal(rows[0].category, "Currency");
  assert.equal(rows[0].exchangeHrefKey, "Orb_of_Augmentation");
  assert.equal(rows[0].goldCost, 20);
  assert.equal(rows[0].localIconPath, "/item-icons/currency-orb-of-augmentation.webp");
  assert.equal(rows[1].localIconPath, "/item-icons/ritual-omen-of-bartering.webp");

  const goldCosts = rowsToGoldCosts(rows);
  assert.equal(goldCosts.get(normalizeName("Omen of Bartering")), 1000);

  const iconSources = rowsToIconSources(rows);
  assert.equal(iconSources.get(normalizeName("Orb of Augmentation")).iconAlt, "CurrencyAddModToMagic");
  assert.equal(getLocalIconPath("Soul Cores", "Soul Core of Tacati"), "/item-icons/soul-cores-soul-core-of-tacati.webp");
  assert.equal(normalizeExchangeHref("/jp/Omen_of_Bartering"), "Omen_of_Bartering");
  assert.equal(normalizeExchangeHref("https://poe2db.tw/kr/Omen_of_Bartering"), "Omen_of_Bartering");
});
