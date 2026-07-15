import test from "node:test";
import assert from "node:assert/strict";
import {
  DASHBOARD_STORAGE_KEY,
  LANDING_HELPER_STORAGE_KEY,
  loadDashboardPreferences,
  loadLandingHelperDismissed,
  saveLandingHelperDismissed,
  saveDashboardPreferences
} from "../lib/dashboard-preferences.ts";

function createStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
    values
  };
}

test("dashboard preferences preserve the existing storage key and shape", () => {
  const storage = createStorage();
  saveDashboardPreferences(
    {
      activeTab: "targets",
      selectedModeKey: "cur-exalted-orb|cur-divine-orb",
      selectedTag: "omens",
      selectedBestBuyItemId: "omen-test",
      search: "omen",
      sortKey: "roi",
      marketFilters: { minStock: "200" },
      favoritesOnly: true,
      favoriteItemIds: ["omen-test"]
    },
    storage
  );

  const saved = JSON.parse(storage.getItem(DASHBOARD_STORAGE_KEY));
  assert.equal("locale" in saved, false);
  assert.equal(saved.marketFilters.minStock, "200");
  assert.deepEqual(saved.favoriteItemIds, ["omen-test"]);
  assert.equal(loadDashboardPreferences(storage).selectedBestBuyItemId, "omen-test");
});

test("dashboard preferences clear corrupt saved data", () => {
  const storage = createStorage({ [DASHBOARD_STORAGE_KEY]: "not-json" });
  assert.equal(loadDashboardPreferences(storage), null);
  assert.equal(storage.getItem(DASHBOARD_STORAGE_KEY), null);
});

test("landing helper dismissal uses an independent versioned preference", () => {
  const storage = createStorage();
  assert.equal(loadLandingHelperDismissed(storage), false);

  saveLandingHelperDismissed(storage);

  assert.equal(storage.getItem(LANDING_HELPER_STORAGE_KEY), "1");
  assert.equal(loadLandingHelperDismissed(storage), true);
  assert.equal(storage.getItem(DASHBOARD_STORAGE_KEY), null);
});

test("landing helper dismissal safely degrades when storage is unavailable", () => {
  const unavailableStorage = {
    getItem() {
      throw new Error("storage unavailable");
    },
    setItem() {
      throw new Error("storage unavailable");
    },
    removeItem() {}
  };

  assert.equal(loadLandingHelperDismissed(unavailableStorage), false);
  assert.doesNotThrow(() => saveLandingHelperDismissed(unavailableStorage));
  assert.equal(loadLandingHelperDismissed(unavailableStorage), true);
});
