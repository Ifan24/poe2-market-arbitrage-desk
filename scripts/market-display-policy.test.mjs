import test from "node:test";
import assert from "node:assert/strict";
import {
  getCategoryIconSrc,
  getCurrencyIconSrc,
  getCurrencyInitials,
  getCurrencyKind,
  getItemIconSrc,
  resolveMarketAssetSrc
} from "../lib/market-display-policy.ts";

test("market display policy identifies known currency kinds and icons", () => {
  assert.equal(getCurrencyKind("Exalted Orb"), "exalted");
  assert.equal(getCurrencyKind("Divine Orb"), "divine");
  assert.equal(getCurrencyKind("Chaos Orb"), "chaos");
  assert.equal(getCurrencyKind("Mirror of Kalandra"), "default");

  assert.equal(getCurrencyIconSrc("Exalted Orb"), "/currency-icons/exalted-orb.webp");
  assert.equal(getCurrencyIconSrc("Divine Orb"), "/currency-icons/divine-orb.webp");
  assert.equal(getCurrencyIconSrc("Chaos Orb"), "/currency-icons/chaos-orb.webp");
  assert.equal(getCurrencyIconSrc("Mirror of Kalandra"), "");
});

test("market display policy derives readable initials for missing icons", () => {
  assert.equal(getCurrencyInitials("Exalted Orb"), "Ex");
  assert.equal(getCurrencyInitials("Divine Orb"), "Dv");
  assert.equal(getCurrencyInitials("Chaos Orb"), "Ch");
  assert.equal(getCurrencyInitials("Greater Jeweller's Orb [Currency]"), "GJ");
});

test("market display policy resolves item and category icon fallbacks", () => {
  assert.equal(getItemIconSrc({ name: "Exalted Orb", iconUrl: "" }), "/currency-icons/exalted-orb.webp");
  assert.equal(getItemIconSrc({ name: "Test Omen", iconUrl: "/item-icons/test.webp" }), "/item-icons/test.webp");

  assert.equal(
    getCategoryIconSrc({
      name: "Test Omen",
      iconUrl: "/item-icons/test.webp",
      tagIconUrl: "/item-icons/omens.webp"
    }),
    "/item-icons/omens.webp"
  );
  assert.equal(
    getCategoryIconSrc({
      name: "Divine Orb",
      iconUrl: "",
      tagIconUrl: ""
    }),
    "/currency-icons/divine-orb.webp"
  );
});

test("market display policy can serve generated item icons from the market data host", () => {
  const originalBaseUrl = process.env.NEXT_PUBLIC_MARKET_DATA_BASE_URL;
  process.env.NEXT_PUBLIC_MARKET_DATA_BASE_URL = "https://data.poe2marketdesk.com/";

  try {
    assert.equal(
      resolveMarketAssetSrc("/item-icons/test.webp"),
      "https://data.poe2marketdesk.com/item-icons/test.webp"
    );
    assert.equal(
      getItemIconSrc({ name: "Test Omen", iconUrl: "/item-icons/test.webp" }),
      "https://data.poe2marketdesk.com/item-icons/test.webp"
    );
    assert.equal(resolveMarketAssetSrc("https://example.com/test.webp"), "https://example.com/test.webp");
    assert.equal(getCurrencyIconSrc("Chaos Orb"), "/currency-icons/chaos-orb.webp");
  } finally {
    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_MARKET_DATA_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_MARKET_DATA_BASE_URL = originalBaseUrl;
    }
  }
});
