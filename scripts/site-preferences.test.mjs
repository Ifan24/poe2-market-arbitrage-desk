import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SITE_PREFERENCES,
  SITE_PREFERENCES_STORAGE_KEY,
  loadSitePreferences,
  saveSitePreferences,
  subscribeSitePreferences
} from "../lib/site-preferences.ts";
import { loadMarketDataBundle } from "../lib/market-data-client.ts";

function installWindow(t) {
  const values = new Map();
  const window = new EventTarget();
  window.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: window });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else delete globalThis.window;
  });
  return window;
}

function emitStorage(window, key = SITE_PREFERENCES_STORAGE_KEY, storageArea = window.localStorage) {
  window.dispatchEvent(Object.assign(new Event("storage"), { key, storageArea }));
}

test("same-window and cross-tab subscribers stay synchronized and unsubscribe cleanly", (t) => {
  const window = installWindow(t);
  let navbarPreferences;
  let selectedLeagueId;
  const stopNavbar = subscribeSitePreferences((preferences) => { navbarPreferences = preferences; });
  const stopPage = subscribeSitePreferences((preferences) => { selectedLeagueId = preferences.selectedLeagueId; });
  saveSitePreferences({ reduceMotion: false, selectedLeagueId: "runes" });
  assert.equal(selectedLeagueId, "runes");
  assert.equal(navbarPreferences.selectedLeagueId, "runes");

  window.localStorage.setItem(SITE_PREFERENCES_STORAGE_KEY, JSON.stringify({ reduceMotion: false, selectedLeagueId: "forbiddenrites" }));
  emitStorage(window);
  assert.equal(selectedLeagueId, "forbiddenrites");
  assert.equal(navbarPreferences.selectedLeagueId, "forbiddenrites");
  saveSitePreferences({ ...navbarPreferences, reduceMotion: true });
  assert.equal(loadSitePreferences().selectedLeagueId, "forbiddenrites");
  assert.equal(navbarPreferences.reduceMotion, true);

  stopNavbar();
  stopPage();
  saveSitePreferences({ reduceMotion: false, selectedLeagueId: "runes" });
  emitStorage(window);
  assert.equal(selectedLeagueId, "forbiddenrites");
  assert.equal(navbarPreferences.reduceMotion, true);
});

test("storage subscriptions ignore other keys and session storage, and reload cleared or corrupt preferences", (t) => {
  const window = installWindow(t);
  const changes = [];
  const stop = subscribeSitePreferences((preferences) => changes.push(preferences));
  t.after(stop);
  window.localStorage.setItem(SITE_PREFERENCES_STORAGE_KEY, JSON.stringify({ reduceMotion: true, selectedLeagueId: "runes" }));
  emitStorage(window, "unrelated-key");
  emitStorage(window, SITE_PREFERENCES_STORAGE_KEY, {});
  assert.deepEqual(changes, [DEFAULT_SITE_PREFERENCES]);
  emitStorage(window);
  assert.deepEqual(changes.at(-1), { reduceMotion: true, selectedLeagueId: "runes" });
  window.localStorage.removeItem(SITE_PREFERENCES_STORAGE_KEY);
  emitStorage(window, null);
  assert.deepEqual(changes.at(-1), DEFAULT_SITE_PREFERENCES);
  window.localStorage.setItem(SITE_PREFERENCES_STORAGE_KEY, "not-json");
  emitStorage(window);
  assert.deepEqual(changes.at(-1), DEFAULT_SITE_PREFERENCES);
  assert.equal(window.localStorage.getItem(SITE_PREFERENCES_STORAGE_KEY), null);
});

test("same-window changes remain usable when browser storage rejects writes", (t) => {
  const window = installWindow(t);
  t.mock.method(window.localStorage, "setItem", () => { throw new Error("storage unavailable"); });
  let current;
  const stop = subscribeSitePreferences((preferences) => { current = preferences; });
  t.after(stop);
  saveSitePreferences({ reduceMotion: true, selectedLeagueId: "runes" });
  assert.deepEqual(current, { reduceMotion: true, selectedLeagueId: "runes" });
});

test("default league persistence notifies subscribers only after bundle artifacts finish loading", async (t) => {
  const window = installWindow(t);
  window.localStorage.setItem(SITE_PREFERENCES_STORAGE_KEY, JSON.stringify({ selectedLeagueId: "expired" }));
  const controller = new AbortController();
  const loaded = [];
  const stop = subscribeSitePreferences((preferences) => {
    if (preferences.selectedLeagueId === "runes") {
      assert.deepEqual(loaded.sort(), ["/snapshot.json", "/status.json", "/trend-index.json"]);
      controller.abort();
    }
  });
  t.after(stop);
  t.mock.method(globalThis, "fetch", async (url, options) => {
    const path = new URL(url).pathname;
    if (path === "/manifest.json") {
      return Response.json({ activeLeague: { id: "runes" }, snapshot: { url: "/snapshot.json" } });
    }
    await Promise.resolve();
    options.signal.throwIfAborted();
    loaded.push(path);
    return Response.json(path === "/status.json" ? { activeLeague: { id: "runes" } } : { league: { id: "runes" } });
  });
  const bundle = await loadMarketDataBundle({
    baseUrl: "https://data.example.com", manifestPath: "/manifest.json",
    statusPath: "/status.json", trendIndexPath: "/trend-index.json"
  }, { signal: controller.signal, includeStatus: true, includeTrend: true });
  assert.equal(bundle.snapshot.league.id, "runes");
  assert.equal(bundle.status.activeLeague.id, "runes");
  assert.equal(bundle.trend.league.id, "runes");
  assert.equal(loadSitePreferences().selectedLeagueId, "runes");
});
