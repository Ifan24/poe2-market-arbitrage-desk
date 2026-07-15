export const SITE_PREFERENCES_STORAGE_KEY = "poe2-site-preferences:v1";

export type SitePreferences = {
  reduceMotion: boolean;
};

export const DEFAULT_SITE_PREFERENCES: SitePreferences = {
  reduceMotion: false
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

export function loadSitePreferences(storage = getPreferenceStorage()): SitePreferences {
  if (!storage) {
    return DEFAULT_SITE_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(storage.getItem(SITE_PREFERENCES_STORAGE_KEY) || "null") as Partial<SitePreferences> | null;
    return {
      reduceMotion: parsed?.reduceMotion === true
    };
  } catch {
    storage.removeItem(SITE_PREFERENCES_STORAGE_KEY);
    return DEFAULT_SITE_PREFERENCES;
  }
}

export function saveSitePreferences(preferences: SitePreferences, storage = getPreferenceStorage()) {
  if (!storage) {
    return;
  }

  storage.setItem(SITE_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

export function applySitePreferences(preferences: SitePreferences) {
  if (typeof document === "undefined") {
    return;
  }

  delete document.documentElement.dataset.uiDensity;
  document.documentElement.dataset.reduceMotion = preferences.reduceMotion ? "true" : "false";
}
