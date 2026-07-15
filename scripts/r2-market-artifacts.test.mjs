import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildMarketArtifactBundle,
  buildRefreshSummary,
  buildSnapshotHistoryIndex,
  collectIconUploads,
  formatGitHubStepSummary,
  readHistoricalMarketSnapshots,
  uploadIconArtifacts,
  uploadMarketArtifacts
} from "../lib/r2-market-artifacts.mjs";

function snapshot() {
  return {
    league: "Runes of Aldur",
    source: "poe2scout",
    state: {
      importedAt: "2026-07-03T14:03:12.000Z",
      items: [{ id: "cur-exalted-orb", name: "Exalted Orb", category: "currency" }],
      targets: [],
      pairs: []
    }
  };
}

test("R2 artifact bundle points manifests at a versioned league snapshot", () => {
  const bundle = buildMarketArtifactBundle({
    snapshot: snapshot(),
    league: { Value: "Runes of Aldur", ShortName: "runes" },
    now: new Date("2026-07-03T14:04:00.000Z")
  });

  assert.equal(bundle.keys.rootManifest, "manifest.json");
  assert.equal(bundle.keys.leagueManifest, "leagues/runes/manifest.json");
  assert.equal(bundle.keys.rootSeoSummary, "seo-summary.json");
  assert.equal(bundle.keys.leagueSeoSummary, "leagues/runes/seo-summary.json");
  assert.equal(bundle.keys.rootHistory, "history.json");
  assert.equal(bundle.keys.leagueHistory, "leagues/runes/history.json");
  assert.equal(bundle.keys.rootTrendIndex, "trend-index.json");
  assert.equal(bundle.keys.leagueTrendIndex, "leagues/runes/trend-index.json");
  assert.equal(bundle.keys.snapshot, "leagues/runes/snapshots/hourly/2026-07-03T14-03-12Z.json");
  assert.equal(bundle.manifest.activeLeague.id, "runes");
  assert.equal(bundle.manifest.snapshot.url, "/leagues/runes/snapshots/hourly/2026-07-03T14-03-12Z.json");
  assert.equal(bundle.manifest.staleAfterMinutes, 90);
  assert.equal(bundle.manifest.veryStaleAfterMinutes, 240);
  assert.equal(JSON.parse(bundle.bodies.seoSummary).league.name, "Runes of Aldur");
});

test("R2 snapshot history keeps ordered league-scoped gaps", () => {
  const bundle = buildMarketArtifactBundle({
    snapshot: snapshot(),
    league: { Value: "Runes of Aldur", ShortName: "runes" },
    now: new Date("2026-07-03T14:04:00.000Z")
  });
  const history = buildSnapshotHistoryIndex({
    bundle,
    now: new Date("2026-07-03T14:05:00.000Z"),
    previous: {
      schemaVersion: 1,
      league: { id: "runes", name: "Runes of Aldur" },
      snapshots: [
        {
          key: "leagues/runes/snapshots/hourly/2026-07-03T10-03-12Z.json",
          url: "/leagues/runes/snapshots/hourly/2026-07-03T10-03-12Z.json",
          generatedAt: "2026-07-03T10:03:12.000Z"
        },
        {
          key: "leagues/runes/snapshots/hourly/2026-07-03T12-03-12Z.json",
          url: "/leagues/runes/snapshots/hourly/2026-07-03T12-03-12Z.json",
          generatedAt: "2026-07-03T12:03:12.000Z"
        }
      ]
    }
  });

  assert.equal(history.league.id, "runes");
  assert.equal(history.snapshotCount, 3);
  assert.deepEqual(
    history.snapshots.map((entry) => entry.generatedAt),
    ["2026-07-03T10:03:12.000Z", "2026-07-03T12:03:12.000Z", "2026-07-03T14:03:12.000Z"]
  );
});

test("R2 snapshot history prunes old data and ignores other leagues", () => {
  const bundle = buildMarketArtifactBundle({
    snapshot: snapshot(),
    league: { Value: "Runes of Aldur", ShortName: "runes" },
    now: new Date("2026-07-03T14:04:00.000Z")
  });
  const history = buildSnapshotHistoryIndex({
    bundle,
    now: new Date("2026-07-03T14:05:00.000Z"),
    previous: {
      schemaVersion: 1,
      league: { id: "runes", name: "Runes of Aldur" },
      snapshots: [
        {
          key: "leagues/runes/snapshots/hourly/2026-06-25T14-03-12Z.json",
          generatedAt: "2026-06-25T14:03:12.000Z"
        },
        {
          key: "leagues/hardcore-runes/snapshots/hourly/2026-07-03T13-03-12Z.json",
          generatedAt: "2026-07-03T13:03:12.000Z"
        },
        {
          key: "leagues/runes/snapshots/hourly/2026-07-03T13-03-12Z.json",
          generatedAt: "2026-07-03T13:03:12.000Z"
        }
      ]
    }
  });

  assert.deepEqual(
    history.snapshots.map((entry) => entry.key),
    [
      "leagues/runes/snapshots/hourly/2026-07-03T13-03-12Z.json",
      "leagues/runes/snapshots/hourly/2026-07-03T14-03-12Z.json"
    ]
  );
});

test("R2 snapshot history refuses previous history from another league", () => {
  const bundle = buildMarketArtifactBundle({
    snapshot: snapshot(),
    league: { Value: "Runes of Aldur", ShortName: "runes" }
  });
  const history = buildSnapshotHistoryIndex({
    bundle,
    previous: {
      league: { id: "standard", name: "Standard" },
      snapshots: [
        {
          key: "leagues/standard/snapshots/hourly/2026-07-03T13-03-12Z.json",
          generatedAt: "2026-07-03T13:03:12.000Z"
        }
      ]
    }
  });

  assert.equal(history.snapshotCount, 1);
  assert.equal(history.snapshots[0].key, bundle.keys.snapshot);
});

test("R2 uploads write snapshot before mutable manifests", async () => {
  const bundle = buildMarketArtifactBundle({
    snapshot: snapshot(),
    league: { Value: "Runes of Aldur", ShortName: "runes" }
  });
  const sent = [];
  const uploads = await uploadMarketArtifacts(bundle, {
    env: {
      R2_BUCKET_NAME: "bucket",
      R2_ACCOUNT_ID: "account",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret"
    },
    client: {
      async send(command) {
        if ("Body" in command.input) {
          sent.push(command.input);
        }
      }
    }
  });

  assert.equal(sent[0].Key, bundle.keys.snapshot);
  assert.equal(sent.at(-1).Key, bundle.keys.rootStatus);
  assert.equal(sent.some((input) => input.Key === bundle.keys.rootSeoSummary), true);
  assert.equal(sent.some((input) => input.Key === bundle.keys.leagueSeoSummary), true);
  assert.equal(sent.some((input) => input.Key === bundle.keys.rootHistory), true);
  assert.equal(sent.some((input) => input.Key === bundle.keys.leagueHistory), true);
  assert.equal(sent.some((input) => input.Key === bundle.keys.rootTrendIndex), true);
  assert.equal(sent.some((input) => input.Key === bundle.keys.leagueTrendIndex), true);
  assert.equal(uploads.find((upload) => upload.key === bundle.keys.leagueHistory).historySnapshots, 1);
  assert.equal(uploads.find((upload) => upload.key === bundle.keys.leagueTrendIndex).trendRoutes, 0);
  assert.equal(uploads[0].cacheControl, "public, max-age=31536000, immutable");
});

test("R2 uploads trend index from historical snapshot samples", async () => {
  const currentSnapshot = {
    ...snapshot(),
    state: {
      importedAt: "2026-07-03T14:03:12.000Z",
      items: [
        { id: "cur-exalted-orb", name: "Exalted Orb", category: "currency" },
        { id: "cur-divine-orb", name: "Divine Orb", category: "currency" },
        { id: "target-sovereign-alloy", name: "Sovereign Alloy", category: "target" }
      ],
      targets: [
        {
          id: "row-sovereign-alloy",
          itemId: "target-sovereign-alloy",
          rates: { "cur-exalted-orb": "50", "cur-divine-orb": "1" },
          valueTradedExalted: 1000,
          highestStock: 500,
          priceExaltedByCurrency: { "cur-exalted-orb": "50", "cur-divine-orb": "100" }
        }
      ],
      pairs: [
        {
          id: "pair-divine-exalted",
          baseItemId: "cur-divine-orb",
          quoteItemId: "cur-exalted-orb",
          rate: "100"
        }
      ]
    }
  };
  const previousSnapshot = {
    ...currentSnapshot,
    state: {
      ...currentSnapshot.state,
      importedAt: "2026-07-03T13:03:12.000Z",
      targets: [
        {
          ...currentSnapshot.state.targets[0],
          rates: { "cur-exalted-orb": "50", "cur-divine-orb": "0.4" }
        }
      ]
    }
  };
  const bundle = buildMarketArtifactBundle({
    snapshot: currentSnapshot,
    league: { Value: "Runes of Aldur", ShortName: "runes" }
  });
  const previousKey = "leagues/runes/snapshots/hourly/2026-07-03T13-03-12Z.json";
  const history = {
    schemaVersion: 1,
    league: { id: "runes", name: "Runes of Aldur" },
    snapshots: [
      {
        key: previousKey,
        generatedAt: "2026-07-03T13:03:12.000Z"
      }
    ]
  };
  const sent = [];

  await uploadMarketArtifacts(bundle, {
    env: {
      R2_BUCKET_NAME: "bucket",
      R2_ACCOUNT_ID: "account",
      R2_ACCESS_KEY_ID: "key",
      R2_SECRET_ACCESS_KEY: "secret"
    },
    client: {
      async send(command) {
        if (command.input.Key === bundle.keys.leagueHistory && !("Body" in command.input)) {
          return { Body: Buffer.from(JSON.stringify(history)) };
        }
        if (command.input.Key === previousKey) {
          return { Body: Buffer.from(JSON.stringify(previousSnapshot)) };
        }
        if ("Body" in command.input) {
          sent.push(command.input);
        }
        return {};
      }
    }
  });

  const trendUpload = sent.find((input) => input.Key === bundle.keys.leagueTrendIndex);
  const trendIndex = JSON.parse(trendUpload.Body);
  const route = trendIndex.routes["target-sovereign-alloy|cur-exalted-orb|cur-divine-orb"];

  assert.equal(trendIndex.routeCount, 1);
  assert.deepEqual(route.profitPersistence["24h"], {
    profitableSamples: 1,
    totalSamples: 2,
    percent: 50
  });
  assert.deepEqual(route.roiSeries, [
    { at: "2026-07-03T13:03:12.000Z", roi: -20, volume: 1000 },
    { at: "2026-07-03T14:03:12.000Z", roi: 100, volume: 1000 }
  ]);
  assert.equal(trendIndex.appreciation.assets["target-sovereign-alloy"].currentPriceDivine, 1);
  assert.ok(Buffer.byteLength(trendUpload.Body, "utf8") < 5000);
});

test("R2 historical snapshot reads ignore cross-league entries", async () => {
  const currentSnapshot = snapshot();
  const currentKey = "leagues/runes/snapshots/hourly/2026-07-03T14-03-12Z.json";
  const fetched = [];
  const snapshots = await readHistoricalMarketSnapshots(
    {
      league: { id: "runes", name: "Runes of Aldur" },
      snapshots: [
        {
          key: "leagues/standard/snapshots/hourly/2026-07-03T13-03-12Z.json",
          generatedAt: "2026-07-03T13:03:12.000Z"
        },
        {
          key: currentKey,
          generatedAt: "2026-07-03T14:03:12.000Z"
        }
      ]
    },
    {
      currentKey,
      currentSnapshot,
      env: {
        R2_BUCKET_NAME: "bucket",
        R2_ACCOUNT_ID: "account",
        R2_ACCESS_KEY_ID: "key",
        R2_SECRET_ACCESS_KEY: "secret"
      },
      client: {
        async send(command) {
          fetched.push(command.input.Key);
          return {};
        }
      }
    }
  );

  assert.deepEqual(fetched, []);
  assert.deepEqual(snapshots, [currentSnapshot]);
});

test("R2 upload keeps previous trend index available when history reads fail", async () => {
  const bundle = buildMarketArtifactBundle({
    snapshot: snapshot(),
    league: { Value: "Runes of Aldur", ShortName: "runes" }
  });
  const sent = [];
  const previousKey = "leagues/runes/snapshots/hourly/2026-07-03T13-03-12Z.json";
  const history = {
    league: { id: "runes", name: "Runes of Aldur" },
    snapshots: [
      {
        key: previousKey,
        generatedAt: "2026-07-03T13:03:12.000Z"
      }
    ]
  };

  await assert.rejects(
    () =>
      uploadMarketArtifacts(bundle, {
        env: {
          R2_BUCKET_NAME: "bucket",
          R2_ACCOUNT_ID: "account",
          R2_ACCESS_KEY_ID: "key",
          R2_SECRET_ACCESS_KEY: "secret"
        },
        client: {
          async send(command) {
            if (command.input.Key === bundle.keys.leagueHistory && !("Body" in command.input)) {
              return { Body: Buffer.from(JSON.stringify(history)) };
            }
            if (command.input.Key === previousKey) {
              throw Object.assign(new Error("temporary read failure"), { name: "ServiceUnavailable" });
            }
            if ("Body" in command.input) {
              sent.push(command.input);
            }
            return {};
          }
        }
      }),
    /temporary read failure/
  );

  assert.deepEqual(sent, []);
});

test("R2 icon uploads use immutable item-icon objects", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "poe2-icons-"));
  try {
    await mkdir(join(tempDir, "nested"));
    await writeFile(join(tempDir, "omen.webp"), Buffer.from([1, 2, 3]));
    await writeFile(join(tempDir, "nested", "category.png"), Buffer.from([4, 5]));

    const uploads = await collectIconUploads({ iconDir: tempDir });
    assert.deepEqual(
      uploads.map((upload) => upload.key),
      ["item-icons/nested/category.png", "item-icons/omen.webp"]
    );

    const sent = [];
    const summary = await uploadIconArtifacts({
      iconDir: tempDir,
      env: {
        R2_BUCKET_NAME: "bucket",
        R2_ACCOUNT_ID: "account",
        R2_ACCESS_KEY_ID: "key",
        R2_SECRET_ACCESS_KEY: "secret"
      },
      client: {
        async send(command) {
          sent.push(command.input);
        }
      }
    });
    const putObjects = sent.filter((input) => input.Body);

    assert.equal(summary.count, 2);
    assert.equal(summary.totalCount, 2);
    assert.equal(summary.bytes, 5);
    assert.equal(putObjects[0].Key, "item-icons/nested/category.png");
    assert.equal(putObjects[0].ContentType, "image/png");
    assert.equal(putObjects[0].CacheControl, "public, max-age=31536000, immutable");
    assert.equal(putObjects[1].Key, "item-icons/omen.webp");
    assert.equal(putObjects[1].ContentType, "image/webp");
    assert.equal(putObjects[2].Key, "item-icons/manifest.json");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("R2 icon uploads skip icons already recorded in the icon manifest", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "poe2-icons-"));
  try {
    await writeFile(join(tempDir, "omen.webp"), Buffer.from([1, 2, 3]));

    const uploads = await collectIconUploads({ iconDir: tempDir });
    const previousManifest = {
      schemaVersion: 1,
      generatedAt: "2026-07-03T14:03:12.000Z",
      icons: uploads.map(({ key, bytes, sha256, contentType }) => ({
        key,
        bytes,
        sha256,
        contentType
      }))
    };
    const sent = [];
    const summary = await uploadIconArtifacts({
      iconDir: tempDir,
      env: {
        R2_BUCKET_NAME: "bucket",
        R2_ACCOUNT_ID: "account",
        R2_ACCESS_KEY_ID: "key",
        R2_SECRET_ACCESS_KEY: "secret"
      },
      client: {
        async send(command) {
          sent.push(command.input);
          if (command.input.Key === "item-icons/manifest.json" && !command.input.Body) {
            return { Body: JSON.stringify(previousManifest) };
          }
          return {};
        }
      }
    });

    assert.equal(summary.count, 0);
    assert.equal(summary.totalCount, 1);
    assert.equal(summary.bytes, 0);
    assert.deepEqual(sent.map((input) => input.Key), ["item-icons/manifest.json"]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("R2 upload summary is safe for GitHub step output", () => {
  const bundle = buildMarketArtifactBundle({
    snapshot: snapshot(),
    league: { Value: "Runes of Aldur", ShortName: "runes" }
  });
  const summary = buildRefreshSummary({
    bundle,
    uploads: [
      { key: bundle.keys.leagueHistory, bytes: 456, cacheControl: "public, max-age=300", historySnapshots: 7, historyWindowHours: 168 },
      { key: bundle.keys.leagueTrendIndex, bytes: 789, cacheControl: "public, max-age=300", trendRoutes: 12, trendSamples: 7 },
      { key: bundle.keys.rootManifest, bytes: 123, cacheControl: "public, max-age=300" }
    ],
    env: { R2_PUBLIC_BASE_URL: "https://data.example.com/" },
    icons: { count: 2, totalCount: 3, bytes: 5 },
    itemCount: 1
  });
  const markdown = formatGitHubStepSummary(summary);

  assert.equal(summary.manifestUrl, "https://data.example.com/manifest.json");
  assert.match(markdown, /Runes of Aldur/);
  assert.match(markdown, /`manifest\.json`/);
  assert.match(markdown, /Icons: 2 uploaded, 3 tracked \(5 bytes uploaded\)/);
  assert.match(markdown, /History coverage: 7 snapshots over 168 hours/);
  assert.match(markdown, /Trend index: ok \(12 routes, 7 samples, 789 bytes\)/);
});
