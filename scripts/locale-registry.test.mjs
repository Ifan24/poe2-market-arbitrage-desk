import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_LOCALE,
  DEFAULT_LOCALE_ROUTE,
  LANGUAGE_SELECTOR_LOCALES,
  LOCALE_DESCRIPTORS,
  LOCALE_ROUTES,
  POE2DB_CURRENCY_NAME_LOCALES,
  POE2DB_CURRENCY_NAME_PAGES,
  SUPPORTED_LOCALE_ROUTES,
  SUPPORTED_LOCALES,
  UI_TEXT_ENGLISH_FALLBACK_LOCALES,
  getLocaleFromRoute,
  getLocaleRoute,
  replaceLocaleInPath
} from "../lib/locale.ts";
import { LOCALE_OPTIONS, LOCALE_TRIGGER_LABELS, UI_TEXT, formatTag } from "../lib/market-locale.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const siteMetadata = fs.readFileSync(path.join(root, "lib", "site-metadata.ts"), "utf8");
const sitemap = fs.readFileSync(path.join(root, "app", "sitemap.ts"), "utf8");
const proxy = fs.readFileSync(path.join(root, "proxy.ts"), "utf8");

const localeLabelSamples = {
  en: "Language",
  "zh-TW": "語言",
  ja: "言語",
  ko: "언어",
  ru: "Язык",
  "zh-CN": "语言",
  pt: "Idioma",
  th: "ภาษา",
  fr: "Langue",
  de: "Sprache",
  es: "Idioma"
};

const selectorLabelSamples = {
  en: "English",
  "zh-TW": "繁中",
  ja: "日本語",
  ko: "한국어",
  ru: "Русский",
  "zh-CN": "简体中文",
  pt: "Português",
  th: "ไทย",
  fr: "Français",
  de: "Deutsch",
  es: "Español"
};

const tagSamples = {
  en: "Base Currency",
  "zh-TW": "基礎通貨",
  ja: "基本通貨",
  ko: "기본 화폐",
  ru: "Базовая валюта",
  "zh-CN": "基础货币",
  pt: "Moeda Base",
  th: "เงินตราพื้นฐาน",
  fr: "Monnaie de base",
  de: "Basiswährung",
  es: "Moneda base"
};

test("supported locale registry covers routes, selector options, and UI text", () => {
  assert.equal(DEFAULT_LOCALE, "en");
  assert.equal(DEFAULT_LOCALE_ROUTE, "en");
  assert.deepEqual(Object.keys(LOCALE_ROUTES).sort(), [...SUPPORTED_LOCALES].sort());
  assert.strictEqual(LOCALE_ROUTES, LOCALE_DESCRIPTORS);

  const routesFromLocaleDescriptors = SUPPORTED_LOCALES.map((locale) => LOCALE_ROUTES[locale].route);
  assert.deepEqual([...routesFromLocaleDescriptors].sort(), [...SUPPORTED_LOCALE_ROUTES].sort());
  assert.equal(new Set(routesFromLocaleDescriptors).size, SUPPORTED_LOCALES.length);

  for (const locale of SUPPORTED_LOCALES) {
    const descriptor = LOCALE_ROUTES[locale];
    assert.equal(descriptor.path, `/${descriptor.route}`);
    assert.equal(getLocaleRoute(locale), descriptor.route);
    assert.equal(getLocaleFromRoute(descriptor.route), locale);
    assert.ok(descriptor.hreflang, `${locale} needs hreflang`);
    assert.ok(descriptor.openGraphLocale, `${locale} needs OpenGraph locale`);
    assert.ok(descriptor.label, `${locale} needs selector label`);
    assert.equal(descriptor.label, selectorLabelSamples[locale]);
    assert.ok(descriptor.acceptLanguagePrefixes.length, `${locale} needs Accept-Language prefixes`);
    assert.equal(UI_TEXT[locale].language, localeLabelSamples[locale]);
    assert.equal(formatTag("Base Currency", locale), tagSamples[locale]);
  }

  const selectorLocales = LOCALE_OPTIONS.map((option) => option.value);
  assert.deepEqual(selectorLocales, LANGUAGE_SELECTOR_LOCALES);
  assert.deepEqual([...selectorLocales].sort(), [...SUPPORTED_LOCALES].sort());
  assert.equal(new Set(selectorLocales).size, SUPPORTED_LOCALES.length);
  assert.deepEqual(Object.keys(LOCALE_TRIGGER_LABELS).sort(), [...SUPPORTED_LOCALES].sort());
  assert.deepEqual([...UI_TEXT_ENGLISH_FALLBACK_LOCALES].sort(), []);
});

test("complete locale pages translate visible app copy", () => {
  const visibleAppCopyKeys = Object.keys(UI_TEXT.en);
  const allowedSharedCopy = {
    "zh-TW": new Set(["roi", "roiMax", "roiMin", "min24h", "min7d", "persistence24h", "persistence7d"]),
    ja: new Set(["roi", "roiMax", "roiMin", "min24h", "min7d", "persistence24h", "persistence7d"]),
    ko: new Set(["roi", "roiMax", "roiMin", "min24h", "min7d", "persistence24h", "persistence7d"]),
    ru: new Set(["roi", "roiMax", "roiMin"]),
    "zh-CN": new Set(["roi", "roiMax", "roiMin"]),
    pt: new Set(["roi", "roiMax", "roiMin", "min24h", "min7d", "persistence24h", "persistence7d", "scanner", "volume", "volumePrefix"]),
    th: new Set(["roiMax", "roiMin"]),
    fr: new Set(["roiMax", "roiMin", "signal", "source", "stock", "stockFilter", "min24h", "persistence24h", "scanner", "stableSignal", "volume", "volumePrefix"]),
    de: new Set(["gold", "name", "roi", "roiMax", "roiMin", "route", "signal", "min24h", "min7d", "persistence24h", "persistence7d", "scanner"]),
    es: new Set(["roiMax", "roiMin", "min24h", "min7d", "persistence24h", "persistence7d"])
  };

  for (const locale of SUPPORTED_LOCALES.filter((locale) => locale !== "en")) {
    if (LOCALE_DESCRIPTORS[locale].uiTextPolicy !== "complete") {
      continue;
    }

    const englishMatches = visibleAppCopyKeys.filter(
      (key) => UI_TEXT[locale][key] === UI_TEXT.en[key] && !allowedSharedCopy[locale]?.has(key)
    );
    assert.deepEqual(englishMatches, [], `${locale} has untranslated visible app-copy keys`);
  }
});

test("locale registry owns POE2DB currency-name source policy", () => {
  assert.deepEqual([...POE2DB_CURRENCY_NAME_LOCALES].sort(), SUPPORTED_LOCALES.filter((locale) => locale !== "en").sort());

  for (const locale of POE2DB_CURRENCY_NAME_LOCALES) {
    assert.equal(POE2DB_CURRENCY_NAME_PAGES[locale], LOCALE_DESCRIPTORS[locale].poe2dbCurrencyExchangeUrl);
  }

  assert.equal(POE2DB_CURRENCY_NAME_PAGES["zh-TW"], "https://poe2db.tw/tw/Currency_Exchange");
  assert.equal(POE2DB_CURRENCY_NAME_PAGES.es, "https://poe2db.tw/sp/Currency_Exchange");
});

test("SEO source stays wired to every supported locale", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const quotedLocale = locale.includes("-") ? `"${locale}"` : locale;

    assert.match(siteMetadata, new RegExp(`${quotedLocale}: \\{\\s+title:`), `${locale} needs localized site metadata`);
    assert.match(proxy, new RegExp(`getLocaleRoute\\(locale\\)`), "root redirect should use the locale route helper");
    assert.match(sitemap, /Object\.values\(LOCALE_ROUTES\)/, "sitemap should derive routes from LOCALE_ROUTES");
  }

  assert.match(siteMetadata, /for \(const locale of SUPPORTED_LOCALES\)/);
  assert.match(siteMetadata, /alternates\["x-default"\] = formatPath\(LOCALE_ROUTES\.en\)/);
  assert.match(siteMetadata, /getLocalizedPageMetadata/);
  assert.match(siteMetadata, /openGraphLocale: getOpenGraphLocale\(locale\)/);
});

test("locale path replacement preserves page suffixes without caller path parsing", () => {
  assert.equal(replaceLocaleInPath("/en", "zh-TW"), "/cn");
  assert.equal(replaceLocaleInPath("/cn/trends", "en"), "/en/trends");
  assert.equal(replaceLocaleInPath("/jp/trends?ignored-by-next-pathname", "ko"), "/kr/trends?ignored-by-next-pathname");
  assert.equal(replaceLocaleInPath("/trends", "ja"), "/jp/trends");
  assert.equal(replaceLocaleInPath("/", "ko"), "/kr");
});
