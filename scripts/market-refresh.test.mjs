import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_REFRESH_COOLDOWN_MS,
  DEFAULT_SERVER_REFRESH_MINUTE,
  getLatestServerRefreshAt,
  getNextServerRefreshAt,
  getSnapshotFreshness,
  refreshMarketData
} from "../lib/market-refresh.mjs";

function snapshot(importedAt) {
  return `window.POE_NINJA_DATA = ${JSON.stringify({
    league: "test",
    state: {
      importedAt,
      items: [],
      targets: [],
      pairs: []
    }
  })};\n`;
}

async function makeRefreshFixture(importedAt) {
  const projectDir = await mkdtemp(join(tmpdir(), "poe2-refresh-"));
  const publicDir = join(projectDir, "public");
  const scriptsDir = join(projectDir, "scripts");
  const dataFile = join(publicDir, "poe-ninja-data.js");
  const updateScript = join(scriptsDir, "update.mjs");
  const countFile = join(projectDir, "count.txt");

  await mkdir(publicDir, { recursive: true });
  await mkdir(scriptsDir, { recursive: true });
  await writeFile(dataFile, snapshot(importedAt), "utf8");
  await writeFile(
    updateScript,
    [
      'import { readFile, writeFile } from "node:fs/promises";',
      `const countFile = ${JSON.stringify(countFile)};`,
      `const dataFile = ${JSON.stringify(dataFile)};`,
      'const current = Number(await readFile(countFile, "utf8").catch(() => "0"));',
      'await writeFile(countFile, String(current + 1), "utf8");',
      `await writeFile(dataFile, ${JSON.stringify(snapshot("2026-06-29T10:00:00.000Z"))}, "utf8");`,
      'console.log("updated");'
    ].join("\n"),
    "utf8"
  );

  return { projectDir, dataFile, updateScript, countFile };
}

async function makeSlowRefreshFixture(importedAt) {
  const fixture = await makeRefreshFixture(importedAt);
  await writeFile(
    fixture.updateScript,
    [
      'import { readFile, writeFile } from "node:fs/promises";',
      `const countFile = ${JSON.stringify(fixture.countFile)};`,
      `const dataFile = ${JSON.stringify(fixture.dataFile)};`,
      'const current = Number(await readFile(countFile, "utf8").catch(() => "0"));',
      'await writeFile(countFile, String(current + 1), "utf8");',
      'await new Promise((resolve) => setTimeout(resolve, 50));',
      `await writeFile(dataFile, ${JSON.stringify(snapshot("2026-06-29T10:00:00.000Z"))}, "utf8");`,
      'console.log("updated slowly");'
    ].join("\n"),
    "utf8"
  );
  return fixture;
}

test("snapshot freshness reports cooldown reuse window", () => {
  const now = Date.parse("2026-06-29T09:20:00.000Z");
  const freshness = getSnapshotFreshness(
    { state: { importedAt: "2026-06-29T09:10:00.000Z", items: [], targets: [], pairs: [] } },
    now,
    DEFAULT_REFRESH_COOLDOWN_MS
  );

  assert.equal(freshness.fresh, true);
  assert.equal(freshness.nextRefreshAt, "2026-06-29T09:25:00.000Z");
  assert.equal(freshness.reason, "cooldown");
});

test("server refresh window resolves around the hourly refresh slot", () => {
  const now = Date.parse("2026-06-29T10:10:00.000Z");

  assert.equal(
    getLatestServerRefreshAt(now, DEFAULT_SERVER_REFRESH_MINUTE),
    "2026-06-29T09:17:00.000Z"
  );
  assert.equal(
    getNextServerRefreshAt(now, DEFAULT_SERVER_REFRESH_MINUTE),
    "2026-06-29T10:17:00.000Z"
  );
});

test("snapshot freshness reuses local data for the current server refresh window", () => {
  const now = Date.parse("2026-06-29T10:00:00.000Z");
  const freshness = getSnapshotFreshness(
    { state: { importedAt: "2026-06-29T09:30:00.000Z", items: [], targets: [], pairs: [] } },
    now,
    DEFAULT_REFRESH_COOLDOWN_MS
  );

  assert.equal(freshness.fresh, true);
  assert.equal(freshness.reason, "server-window");
  assert.equal(freshness.latestServerRefreshAt, "2026-06-29T09:17:00.000Z");
  assert.equal(freshness.nextRefreshAt, "2026-06-29T10:17:00.000Z");
});

test("refresh reuses fresh snapshots without spawning the update script", async () => {
  const fixture = await makeRefreshFixture("2026-06-29T10:00:00.000Z");
  const result = await refreshMarketData({
    ...fixture,
    now: Date.parse("2026-06-29T10:05:00.000Z")
  });

  assert.equal(result.reused, true);
  assert.equal(result.refreshed, false);
  await assert.rejects(readFile(fixture.countFile, "utf8"));
});

test("refresh reuses snapshots when the next server refresh slot has not happened yet", async () => {
  const fixture = await makeRefreshFixture("2026-06-29T09:30:00.000Z");
  const result = await refreshMarketData({
    ...fixture,
    now: Date.parse("2026-06-29T10:00:00.000Z")
  });

  assert.equal(result.reused, true);
  assert.equal(result.refreshed, false);
  assert.equal(result.reason, "server-window");
  assert.equal(result.nextRefreshAt, "2026-06-29T10:17:00.000Z");
  await assert.rejects(readFile(fixture.countFile, "utf8"));
});

test("refresh updates stale snapshots through the shared orchestration module", async () => {
  const fixture = await makeRefreshFixture("2026-06-29T09:00:00.000Z");
  const result = await refreshMarketData({
    ...fixture,
    now: Date.parse("2026-06-29T10:00:00.000Z")
  });

  assert.equal(result.reused, false);
  assert.equal(result.refreshed, true);
  assert.equal(result.log, "updated");
  assert.equal(await readFile(fixture.countFile, "utf8"), "1");
  assert.equal(result.data.state.importedAt, "2026-06-29T10:00:00.000Z");
});

test("refresh creates a missing snapshot instead of failing before update", async () => {
  const fixture = await makeRefreshFixture("2026-06-29T09:00:00.000Z");
  await rm(fixture.dataFile);
  const result = await refreshMarketData({
    ...fixture,
    now: Date.parse("2026-06-29T10:00:00.000Z")
  });

  assert.equal(result.refreshed, true);
  assert.equal(await readFile(fixture.countFile, "utf8"), "1");
  assert.equal(result.data.state.importedAt, "2026-06-29T10:00:00.000Z");
});

test("concurrent refreshes collapse to one active update script", async () => {
  const fixture = await makeSlowRefreshFixture("2026-06-29T09:00:00.000Z");
  const now = Date.parse("2026-06-29T10:00:00.000Z");
  const [first, second] = await Promise.all([
    refreshMarketData({ ...fixture, now }),
    refreshMarketData({ ...fixture, now })
  ]);

  assert.equal(first.refreshed, true);
  assert.equal(second.refreshed, true);
  assert.equal(first.log, "updated slowly");
  assert.equal(second.log, "updated slowly");
  assert.equal(await readFile(fixture.countFile, "utf8"), "1");
});
