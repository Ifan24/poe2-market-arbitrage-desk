export const LOCALE_DESCRIPTORS = {
  en: {
    path: "/en",
    route: "en",
    hreflang: "en",
    openGraphLocale: "en_US",
    label: "English",
    selectorOrder: 100,
    acceptLanguagePrefixes: ["en"],
    uiTextPolicy: "complete",
    poe2dbCurrencyExchangeUrl: undefined
  },
  "zh-TW": {
    path: "/cn",
    route: "cn",
    hreflang: "zh-TW",
    openGraphLocale: "zh_TW",
    label: "繁中",
    selectorOrder: 10,
    acceptLanguagePrefixes: ["zh-tw", "zh-hant", "zh-hk", "zh-mo"],
    uiTextPolicy: "complete",
    poe2dbCurrencyExchangeUrl: "https://poe2db.tw/tw/Currency_Exchange"
  },
  ja: {
    path: "/jp",
    route: "jp",
    hreflang: "ja",
    openGraphLocale: "ja_JP",
    label: "日本語",
    selectorOrder: 30,
    acceptLanguagePrefixes: ["ja"],
    uiTextPolicy: "complete",
    poe2dbCurrencyExchangeUrl: "https://poe2db.tw/jp/Currency_Exchange"
  },
  ko: {
    path: "/kr",
    route: "kr",
    hreflang: "ko",
    openGraphLocale: "ko_KR",
    label: "한국어",
    selectorOrder: 40,
    acceptLanguagePrefixes: ["ko", "kr"],
    uiTextPolicy: "complete",
    poe2dbCurrencyExchangeUrl: "https://poe2db.tw/kr/Currency_Exchange"
  },
  ru: {
    path: "/ru",
    route: "ru",
    hreflang: "ru",
    openGraphLocale: "ru_RU",
    label: "Русский",
    selectorOrder: 50,
    acceptLanguagePrefixes: ["ru"],
    uiTextPolicy: "complete",
    poe2dbCurrencyExchangeUrl: "https://poe2db.tw/ru/Currency_Exchange"
  },
  "zh-CN": {
    path: "/zh-cn",
    route: "zh-cn",
    hreflang: "zh-CN",
    openGraphLocale: "zh_CN",
    label: "简体中文",
    selectorOrder: 20,
    acceptLanguagePrefixes: ["zh-cn", "zh-hans", "zh"],
    uiTextPolicy: "complete",
    poe2dbCurrencyExchangeUrl: "https://poe2db.tw/cn/Currency_Exchange"
  },
  pt: {
    path: "/pt",
    route: "pt",
    hreflang: "pt",
    openGraphLocale: "pt_PT",
    label: "Português",
    selectorOrder: 60,
    acceptLanguagePrefixes: ["pt"],
    uiTextPolicy: "complete",
    poe2dbCurrencyExchangeUrl: "https://poe2db.tw/pt/Currency_Exchange"
  },
  th: {
    path: "/th",
    route: "th",
    hreflang: "th",
    openGraphLocale: "th_TH",
    label: "ไทย",
    selectorOrder: 70,
    acceptLanguagePrefixes: ["th"],
    uiTextPolicy: "complete",
    poe2dbCurrencyExchangeUrl: "https://poe2db.tw/th/Currency_Exchange"
  },
  fr: {
    path: "/fr",
    route: "fr",
    hreflang: "fr",
    openGraphLocale: "fr_FR",
    label: "Français",
    selectorOrder: 80,
    acceptLanguagePrefixes: ["fr"],
    uiTextPolicy: "complete",
    poe2dbCurrencyExchangeUrl: "https://poe2db.tw/fr/Currency_Exchange"
  },
  de: {
    path: "/de",
    route: "de",
    hreflang: "de",
    openGraphLocale: "de_DE",
    label: "Deutsch",
    selectorOrder: 90,
    acceptLanguagePrefixes: ["de"],
    uiTextPolicy: "complete",
    poe2dbCurrencyExchangeUrl: "https://poe2db.tw/de/Currency_Exchange"
  },
  es: {
    path: "/es",
    route: "es",
    hreflang: "es",
    openGraphLocale: "es_ES",
    label: "Español",
    selectorOrder: 95,
    acceptLanguagePrefixes: ["es"],
    uiTextPolicy: "complete",
    poe2dbCurrencyExchangeUrl: "https://poe2db.tw/sp/Currency_Exchange"
  }
} as const;

export type Locale = keyof typeof LOCALE_DESCRIPTORS;
export type LocaleDescriptor = (typeof LOCALE_DESCRIPTORS)[Locale];
export type LocaleRoute = LocaleDescriptor["route"];

export const DEFAULT_LOCALE: Locale = "en";
export const DEFAULT_LOCALE_ROUTE: LocaleRoute = LOCALE_DESCRIPTORS[DEFAULT_LOCALE].route;
export const LOCALE_ROUTES = LOCALE_DESCRIPTORS;
export const SUPPORTED_LOCALES = Object.keys(LOCALE_DESCRIPTORS) as Locale[];
export const SUPPORTED_LOCALE_ROUTES = SUPPORTED_LOCALES.map((locale) => LOCALE_DESCRIPTORS[locale].route) as LocaleRoute[];
export const LANGUAGE_SELECTOR_LOCALES = [...SUPPORTED_LOCALES].sort(
  (left, right) => LOCALE_DESCRIPTORS[left].selectorOrder - LOCALE_DESCRIPTORS[right].selectorOrder
);
type UiTextPolicy = "complete" | "english-fallback";

function isEnglishFallbackPolicy(policy: UiTextPolicy) {
  return policy === "english-fallback";
}

export const UI_TEXT_ENGLISH_FALLBACK_LOCALES = SUPPORTED_LOCALES.filter((locale) =>
  isEnglishFallbackPolicy(LOCALE_DESCRIPTORS[locale].uiTextPolicy)
);
export const POE2DB_CURRENCY_NAME_LOCALES = SUPPORTED_LOCALES.filter(
  (locale) => Boolean(LOCALE_DESCRIPTORS[locale].poe2dbCurrencyExchangeUrl)
) as Exclude<Locale, "en">[];
export const POE2DB_CURRENCY_NAME_PAGES = Object.fromEntries(
  POE2DB_CURRENCY_NAME_LOCALES.map((locale) => [locale, LOCALE_DESCRIPTORS[locale].poe2dbCurrencyExchangeUrl])
) as Record<(typeof POE2DB_CURRENCY_NAME_LOCALES)[number], string>;

const LOCALES_BY_ROUTE = new Map<LocaleRoute, Locale>(
  SUPPORTED_LOCALES.map((locale) => [LOCALE_DESCRIPTORS[locale].route, locale])
);

export function getSupportedLocale(value: string | null | undefined): Locale {
  const normalized = String(value || "").toLowerCase();

  for (const locale of SUPPORTED_LOCALES) {
    if (LOCALE_DESCRIPTORS[locale].acceptLanguagePrefixes.some((prefix) => normalized.startsWith(prefix))) {
      return locale;
    }
  }

  return DEFAULT_LOCALE;
}

export function getLocaleFromAcceptLanguage(header: string | null | undefined): Locale {
  const locales = String(header || "")
    .split(",")
    .map((part) => part.trim().split(";")[0])
    .filter(Boolean);

  for (const locale of locales) {
    const supportedLocale = getSupportedLocale(locale);
    if (supportedLocale !== DEFAULT_LOCALE || locale.toLowerCase().startsWith("en")) {
      return supportedLocale;
    }
  }

  return DEFAULT_LOCALE;
}

export function getLocaleFromRoute(route: string | null | undefined): Locale | null {
  return LOCALES_BY_ROUTE.get(route as LocaleRoute) || null;
}

export function getLocaleRoute(locale: Locale): LocaleRoute {
  return LOCALE_ROUTES[locale].route;
}

export function replaceLocaleInPath(pathname: string, nextLocale: Locale) {
  const nextRoute = getLocaleRoute(nextLocale);
  const [firstSegment, currentRoute, ...rest] = pathname.split("/");
  const suffixParts = getLocaleFromRoute(currentRoute) ? rest : [currentRoute, ...rest].filter(Boolean);
  const suffix = suffixParts.join("/");

  return `${firstSegment}/${nextRoute}${suffix ? `/${suffix}` : ""}`;
}
