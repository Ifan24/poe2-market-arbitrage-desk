export const SITE_PREFERENCES_STORAGE_KEY = "poe2-site-preferences:v1";
export const SITE_PREFERENCES_CHANGED_EVENT = "poe2-site-preferences-changed";

export type SitePreferences = {
  reduceMotion: boolean;
  selectedLeagueId: string;
};

export const DEFAULT_SITE_PREFERENCES: SitePreferences = {
  reduceMotion: false,
  selectedLeagueId: ""
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
      reduceMotion: parsed?.reduceMotion === true,
      selectedLeagueId: typeof parsed?.selectedLeagueId === "string" ? parsed.selectedLeagueId : ""
    };
  } catch {
    storage.removeItem(SITE_PREFERENCES_STORAGE_KEY);
    return DEFAULT_SITE_PREFERENCES;
  }
}

export function saveSitePreferences(preferences: SitePreferences, storage = getPreferenceStorage()) {
  try {
    storage?.setItem(SITE_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Keep in-session selection usable when browser storage is unavailable.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<SitePreferences>(SITE_PREFERENCES_CHANGED_EVENT, { detail: preferences }));
  }
}

export function subscribeSitePreferences(onChange: (preferences: SitePreferences) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const eventTarget = window;
  const onPreferencesChanged = (event: Event) => {
    onChange((event as CustomEvent<SitePreferences>).detail || loadSitePreferences());
  };
  const onStorage = (event: StorageEvent) => {
    if ((event.key === SITE_PREFERENCES_STORAGE_KEY || event.key === null)
      && event.storageArea === getPreferenceStorage()) {
      onChange(loadSitePreferences());
    }
  };
  eventTarget.addEventListener(SITE_PREFERENCES_CHANGED_EVENT, onPreferencesChanged);
  eventTarget.addEventListener("storage", onStorage);
  onChange(loadSitePreferences());

  return () => {
    eventTarget.removeEventListener(SITE_PREFERENCES_CHANGED_EVENT, onPreferencesChanged);
    eventTarget.removeEventListener("storage", onStorage);
  };
}

export function applySitePreferences(preferences: SitePreferences) {
  if (typeof document === "undefined") {
    return;
  }

  delete document.documentElement.dataset.uiDensity;
  document.documentElement.dataset.reduceMotion = preferences.reduceMotion ? "true" : "false";
}
