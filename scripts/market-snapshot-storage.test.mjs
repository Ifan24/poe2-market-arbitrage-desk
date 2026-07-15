import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getJsonSnapshotFile,
  parseMarketDataSnapshot,
  readMarketDataFile,
  toBrowserSnapshotSource,
  writeMarketDataFiles
} from "../lib/market-snapshot-storage.mjs";

function data(importedAt = "2026-06-29T10:00:00.000Z") {
  return {
    league: "test",
    state: {
      importedAt,
      items: [],
      targets: [],
      pairs: []
    }
  };
}

test("snapshot storage parses plain JSON and legacy browser snapshots without vm", () => {
  const snapshot = data();

  assert.deepEqual(parseMarketDataSnapshot(JSON.stringify(snapshot)), snapshot);
  assert.deepEqual(parseMarketDataSnapshot(toBrowserSnapshotSource(snapshot)), snapshot);
});

test("snapshot storage prefers JSON when both JSON and browser snapshot files exist", async () => {
  const dir = await mkdtemp(join(tmpdir(), "poe2-snapshot-storage-"));
  const dataFile = join(dir, "poe-ninja-data.js");
  const jsonFile = getJsonSnapshotFile(dataFile);

  await writeFile(dataFile, toBrowserSnapshotSource(data("2026-06-29T09:00:00.000Z")), "utf8");
  await writeFile(jsonFile, JSON.stringify(data("2026-06-29T10:00:00.000Z")), "utf8");

  const snapshot = await readMarketDataFile(dataFile);
  assert.equal(snapshot.state.importedAt, "2026-06-29T10:00:00.000Z");
});

test("snapshot storage writes JSON plus the browser compatibility file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "poe2-snapshot-storage-"));
  const dataFile = join(dir, "poe-ninja-data.js");
  const jsonFile = getJsonSnapshotFile(dataFile);
  const snapshot = data();

  await writeMarketDataFiles(snapshot, { dataFile });

  assert.deepEqual(JSON.parse(await readFile(jsonFile, "utf8")), snapshot);
  assert.match(await readFile(dataFile, "utf8"), /^window\.POE_NINJA_DATA = /);
  assert.deepEqual(await readMarketDataFile(dataFile), snapshot);
});

test("snapshot storage preserves URL paths when deriving the JSON file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "poe2-snapshot-storage-"));
  const dataFile = new URL(`file://${join(dir, "poe-ninja-data.js")}`);
  const jsonFile = getJsonSnapshotFile(dataFile);
  const snapshot = data();

  assert.equal(jsonFile instanceof URL, true);
  assert.equal(jsonFile.pathname.endsWith("/poe-ninja-data.json"), true);

  await writeMarketDataFiles(snapshot, { dataFile });

  assert.deepEqual(JSON.parse(await readFile(jsonFile, "utf8")), snapshot);
  assert.deepEqual(parseMarketDataSnapshot(await readFile(dataFile, "utf8")), snapshot);
});
