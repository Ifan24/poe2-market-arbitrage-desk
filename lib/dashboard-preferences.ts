import type { Locale } from "./locale";
import type { MarketFilters } from "./market-arbitrage";

export const DASHBOARD_STORAGE_KEY = "poe2-shadcn-dashboard:v2";
export const LANDING_HELPER_STORAGE_KEY = "poe2-dashboard-landing-helper-dismissed-v1";
const SNAPSHOT_REMINDER_STORAGE_KEY = "poe2-snapshot-reminder-dismissed:v1";
let landingHelperDismissedInMemory = false;

export type DashboardPreferences = {
  activeTab?: string;
  selectedModeKey?: string;
  selectedTag?: string;
  selectedBestBuyItemId?: string;
  search?: string;
  sortKey?: string;
  marketFilters?: Partial<Record<keyof MarketFilters, string>>;
  favoritesOnly?: boolean;
  favoriteItemIds?: string[];
};

type PreferenceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getPreferenceStorage(): PreferenceStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage(): PreferenceStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

function parsePreferences(raw: string | null): DashboardPreferences | null {
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw) as unknown;
  return parsed && typeof parsed === "object" ? (parsed as DashboardPreferences) : null;
}

export function getBrowserLocaleHint() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.navigator.language;
}

export function loadDashboardPreferences(storage = getPreferenceStorage()) {
  if (!storage) {
    return null;
  }

  try {
    return parsePreferences(storage.getItem(DASHBOARD_STORAGE_KEY));
  } catch {
    storage.removeItem(DASHBOARD_STORAGE_KEY);
    return null;
  }
}

export function saveDashboardPreferences(preferences: DashboardPreferences, storage = getPreferenceStorage()) {
  if (!storage) {
    return;
  }

  storage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(preferences));
}

export function loadLandingHelperDismissed(storage = getPreferenceStorage()) {
  if (landingHelperDismissedInMemory) {
    return true;
  }

  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(LANDING_HELPER_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveLandingHelperDismissed(storage = getPreferenceStorage()) {
  if (!storage) {
    landingHelperDismissedInMemory = true;
    return;
  }

  try {
    storage.setItem(LANDING_HELPER_STORAGE_KEY, "1");
  } catch {
    landingHelperDismissedInMemory = true;
  }
}

export function setDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = locale;
}

export function loadDismissedSnapshotReminderSlot(storage = getSessionStorage()) {
  if (!storage) {
    return "";
  }

  return storage.getItem(SNAPSHOT_REMINDER_STORAGE_KEY) || "";
}

export function saveDismissedSnapshotReminderSlot(slot: string, storage = getSessionStorage()) {
  if (!storage) {
    return;
  }

  storage.setItem(SNAPSHOT_REMINDER_STORAGE_KEY, slot);
}
