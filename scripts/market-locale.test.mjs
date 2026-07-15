import test from "node:test";
import assert from "node:assert/strict";
import {
  UI_TEXT,
  formatDate,
  formatItemName,
  formatMessage,
  formatNumber,
  formatPercent,
  formatTag
} from "../lib/market-locale.ts";

test("market locale translates known currency names and category suffixes", () => {
  assert.equal(formatItemName({ name: "Exalted Orb" }, "zh-TW"), "崇高石");
  assert.equal(formatItemName({ name: "Exalted Orb" }, "ja"), "高貴なオーブ");
  assert.equal(formatItemName({ name: "Exalted Orb" }, "ko"), "엑잘티드 오브");
  assert.equal(formatItemName({ name: "Mirror of Kalandra" }, "zh-TW"), "卡蘭德的魔鏡");
  assert.equal(formatItemName({ name: "Mirror of Kalandra" }, "ja"), "カランドラの鏡");
  assert.equal(formatItemName({ name: "Mirror of Kalandra" }, "ko"), "칼란드라의 거울");
  assert.equal(formatItemName({ name: "Uncut Spirit Gem (Level 20) [Uncut Gems]" }, "zh-TW"), "未切割的精魂寶石（等級 20） [未切割的寶石]");
  assert.equal(formatItemName({ name: "Uncut Spirit Gem (Level 20) [Uncut Gems]" }, "ja"), "スピリットジェムの原石 (レベル20) [未加工ジェム]");
  assert.equal(formatItemName({ name: "Uncut Spirit Gem (Level 20) [Uncut Gems]" }, "ko"), "미가공 정신력 젬 (20레벨) [미가공 젬]");
  assert.equal(formatItemName({ name: "Test Omen [omens]" }, "zh-TW"), "Test Omen [預兆]");
  assert.equal(formatItemName({ name: "Test Omen [omens]" }, "ja"), "Test Omen [前兆]");
  assert.equal(formatItemName({ name: "Test Omen [omens]" }, "ko"), "Test Omen [징조]");
  assert.equal(formatItemName({ name: "Test Omen [omens]" }, "en"), "Test Omen [omens]");
  assert.equal(formatTag("Base Currency", "zh-TW"), "基礎通貨");
  assert.equal(formatTag("Base Currency", "ja"), "基本通貨");
  assert.equal(formatTag("Base Currency", "ko"), "기본 화폐");
  assert.equal(formatTag("Uncut Gems", "zh-TW"), "未切割的寶石");
  assert.equal(formatTag("uncutgems", "zh-TW"), "未切割的寶石");
  assert.equal(formatTag("Omens", "zh-TW"), "預兆");
  assert.equal(formatTag("Lineage Gems", "zh-TW"), "血脈寶石");
  assert.equal(formatTag("Liquid Emotions", "zh-TW"), "液態情緒");
  assert.equal(formatTag("vaultkeys", "zh-TW"), "寶庫鑰匙");
});

test("market locale formats reusable dashboard text", () => {
  assert.equal(formatMessage("Buy {count} {name}", { count: 2, name: "Divine Orb" }), "Buy 2 Divine Orb");
  assert.equal(formatNumber(1234.567, 1, "en"), "1,234.6");
  assert.equal(formatPercent(2.5, "en"), "+2.5%");
  assert.equal(formatPercent(Number.NaN, "en"), "--");
  assert.equal(formatDate(undefined, "en", UI_TEXT.en), "No market data");
});
