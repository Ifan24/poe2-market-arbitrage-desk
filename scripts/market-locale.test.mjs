import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  UI_TEXT,
  formatDate,
  formatItemName,
  formatMessage,
  formatNumber,
  formatPercent,
  formatTag
} from "../lib/market-locale.ts";

const marketBaseline = JSON.parse(
  fs.readFileSync(new URL("../public/market-baseline.json", import.meta.url), "utf8")
);

test("market locale translates known currency names and category suffixes", () => {
  assert.equal(formatItemName({ name: "Exalted Orb" }, "zh-TW"), "崇高石");
  assert.equal(formatItemName({ name: "Exalted Orb" }, "ja"), "高貴なオーブ");
  assert.equal(formatItemName({ name: "Exalted Orb" }, "ko"), "엑잘티드 오브");
  assert.equal(formatItemName({ name: "Mirror of Kalandra" }, "zh-TW"), "卡蘭德的魔鏡");
  assert.equal(formatItemName({ name: "Mirror of Kalandra" }, "ja"), "カランドラの鏡");
  assert.equal(formatItemName({ name: "Mirror of Kalandra" }, "ko"), "칼란드라의 거울");
  assert.equal(formatItemName({ name: "Uncut Spirit Gem (Level 20) [Uncut Gems]" }, "zh-TW"), "未切割的精魂寶石（等級 20） [未切割的寶石]");
  assert.equal(formatItemName({ name: "Uncut Spirit Gem (Level 20) [Uncut Gems]" }, "ja"), "スピリットジェムの原石 (レベル20) [ジェムの原石]");
  assert.equal(formatItemName({ name: "Uncut Spirit Gem (Level 20) [Uncut Gems]" }, "ko"), "미가공 정신력 젬 (20레벨) [미가공 젬]");
  assert.equal(formatItemName({ name: "Test Omen [omens]" }, "zh-TW"), "Test Omen [徵兆]");
  assert.equal(formatItemName({ name: "Test Omen [omens]" }, "ja"), "Test Omen [お告げ]");
  assert.equal(formatItemName({ name: "Test Omen [omens]" }, "ko"), "Test Omen [징조]");
  assert.equal(formatItemName({ name: "Test Omen [omens]" }, "en"), "Test Omen [omens]");
  assert.equal(formatTag("Base Currency", "zh-TW"), "基礎通貨");
  assert.equal(formatTag("Base Currency", "ja"), "基本通貨");
  assert.equal(formatTag("Base Currency", "ko"), "기본 화폐");
  assert.equal(formatTag("Uncut Gems", "zh-TW"), "未切割的寶石");
  assert.equal(formatTag("uncutgems", "zh-TW"), "未切割的寶石");
  assert.equal(formatTag("Omens", "zh-TW"), "徵兆");
  assert.equal(formatTag("Lineage Gems", "zh-TW"), "族裔輔助寶石");
  assert.equal(formatTag("Liquid Emotions", "zh-TW"), "液態情感");
  assert.equal(formatTag("vaultkeys", "zh-TW"), "聖物鑰匙");
});

test("every non-English locale translates the category tags used by the market baseline", () => {
  const baselineTags = new Set(
    marketBaseline.state.items.map((item) => item.tag || item.category).filter(Boolean)
  );
  const allowedLocalizedProperNouns = {
    fr: new Set(["Expedition", "Verisium"]),
    de: new Set(["Expedition", "Verisium"]),
    es: new Set(["Verisium"])
  };

  for (const locale of ["zh-TW", "ja", "ko", "ru", "zh-CN", "pt", "th", "fr", "de", "es"]) {
    const untranslatedTags = [...baselineTags].filter(
      (tag) => formatTag(tag, locale) === tag && !allowedLocalizedProperNouns[locale]?.has(tag)
    );

    assert.deepEqual(untranslatedTags, [], `${locale} has untranslated market category tags`);
  }
});

test("market locales use POE2DB Currency Exchange terminology for game categories", () => {
  const expected = {
    "zh-TW": { Currency: "通貨", ultimatum: "靈魂核心", Omens: "徵兆", vaultkeys: "聖物鑰匙" },
    ja: { Currency: "カレンシー", fragments: "フラグメント", ultimatum: "ソウルコア", vaultkeys: "聖廟の鍵" },
    ko: { fragments: "조각", ultimatum: "영혼 핵", "Lineage Gems": "혈통 보조 젬", vaultkeys: "성유물 보관실 열쇠" },
    ru: { essences: "Сущности", ultimatum: "Ядра душ", uncutgems: "Неогранённые камни", vaultkeys: "Ключи от Реликвария" },
    "zh-CN": {
      essences: "精华",
      ultimatum: "灵核",
      Expedition: "先祖秘藏",
      vaultkeys: "圣物厅钥匙",
      uncutgems: "未切割的宝石",
      "Lineage Gems": "血脉辅助宝石",
      "Liquid Emotions": "液化情感",
      incursion: "阿兹里神庙",
      idol: "雕像",
      Verisium: "维金"
    },
    pt: { Currency: "Moeda", ultimatum: "Núcleos d'Alma", vaultkeys: "Chaves do Relicário" },
    th: { runes: "อักขระ", ultimatum: "แกนวิญญาณ", Expedition: "กองสำรวจ" },
    fr: { Currency: "Objets monétaires", ultimatum: "Noyaux d'âme", incursion: "Temple d'Atziri" },
    de: { ultimatum: "Seelenkerne", vaultkeys: "Schlüssel zur Reliquienkammer", incursion: "Atziris Tempel" },
    es: { Currency: "Objetos monetarios", ultimatum: "Núcleos de alma", incursion: "Templo de Atziri" }
  };

  for (const [locale, labels] of Object.entries(expected)) {
    for (const [tag, label] of Object.entries(labels)) {
      assert.equal(formatTag(tag, locale), label, `${locale} ${tag}`);
    }
  }
});

test("market locale formats reusable dashboard text", () => {
  assert.equal(formatMessage("Buy {count} {name}", { count: 2, name: "Divine Orb" }), "Buy 2 Divine Orb");
  assert.equal(formatNumber(1234.567, 1, "en"), "1,234.6");
  assert.equal(formatPercent(2.5, "en"), "+2.5%");
  assert.equal(formatPercent(Number.NaN, "en"), "--");
  assert.equal(formatDate(undefined, "en", UI_TEXT.en), "No market data");
});
