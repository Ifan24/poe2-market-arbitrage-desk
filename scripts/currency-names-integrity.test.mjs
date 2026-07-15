import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { POE2DB_CURRENCY_NAME_LOCALES } from "../lib/locale.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const currencyNameFiles = Object.fromEntries(
  POE2DB_CURRENCY_NAME_LOCALES.map((locale) => [locale, `currency-names.${locale}.json`])
);

const coreNames = {
  "zh-TW": {
    "Exalted Orb": "崇高石",
    "Divine Orb": "神聖石",
    "Mirror of Kalandra": "卡蘭德的魔鏡"
  },
  ja: {
    "Exalted Orb": "高貴なオーブ",
    "Divine Orb": "神のオーブ",
    "Mirror of Kalandra": "カランドラの鏡"
  },
  ko: {
    "Exalted Orb": "엑잘티드 오브",
    "Divine Orb": "신성한 오브",
    "Mirror of Kalandra": "칼란드라의 거울"
  },
  ru: {
    "Exalted Orb": "Сфера возвышения",
    "Divine Orb": "Божественная сфера",
    "Mirror of Kalandra": "Зеркало Каландры"
  },
  "zh-CN": {
    "Exalted Orb": "崇高石",
    "Divine Orb": "神圣石",
    "Mirror of Kalandra": "卡兰德的魔镜"
  },
  pt: {
    "Exalted Orb": "Orbe Exaltado",
    "Divine Orb": "Orbe Divino",
    "Mirror of Kalandra": "Espelho de Kalandra"
  },
  th: {
    "Exalted Orb": "Exalted Orb",
    "Divine Orb": "Divine Orb",
    "Mirror of Kalandra": "Mirror of Kalandra"
  },
  fr: {
    "Exalted Orb": "Orbe exalté",
    "Divine Orb": "Orbe divin",
    "Mirror of Kalandra": "Miroir de Kalandra"
  },
  de: {
    "Exalted Orb": "Erhabene Sphäre",
    "Divine Orb": "Göttliche Sphäre",
    "Mirror of Kalandra": "Spiegel von Kalandra"
  },
  es: {
    "Exalted Orb": "Orbe exaltado",
    "Divine Orb": "Orbe divino",
    "Mirror of Kalandra": "Espejo de Kalandra"
  }
};

function readCurrencyNames(fileName) {
  return JSON.parse(fs.readFileSync(path.join(root, "lib", fileName), "utf8"));
}

test("localized POE2DB currency-name files have matching key coverage", () => {
  assert.deepEqual(Object.keys(currencyNameFiles).sort(), [...POE2DB_CURRENCY_NAME_LOCALES].sort());
  assert.deepEqual(Object.keys(coreNames).sort(), [...POE2DB_CURRENCY_NAME_LOCALES].sort());

  const entries = Object.entries(currencyNameFiles).map(([locale, fileName]) => [locale, readCurrencyNames(fileName)]);
  const [sourceLocale, sourceMap] = entries[0];
  const sourceKeys = Object.keys(sourceMap).sort();

  assert.ok(sourceKeys.length >= 600, `${sourceLocale} should include the full POE2DB currency exchange list`);

  for (const [locale, nameMap] of entries) {
    const keys = Object.keys(nameMap).sort();
    assert.deepEqual(keys, sourceKeys, `${locale} currency-name keys should match ${sourceLocale}`);

    for (const key of keys) {
      assert.equal(typeof nameMap[key], "string", `${locale} ${key} should be a string`);
      assert.ok(nameMap[key].trim(), `${locale} ${key} should not be empty`);
    }
  }
});

test("localized POE2DB currency-name files keep core currency translations", () => {
  for (const [locale, expectedNames] of Object.entries(coreNames)) {
    const nameMap = readCurrencyNames(currencyNameFiles[locale]);

    for (const [englishName, localizedName] of Object.entries(expectedNames)) {
      assert.equal(nameMap[englishName], localizedName);
    }
  }
});
