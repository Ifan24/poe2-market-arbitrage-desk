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
  readHistoricalMarketSnapshots,
  selectPublishedSoftcoreLeagues,
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

test("configured publication advertises only its live subset, not newly discovered leagues", () => {
  const leagues = [
    { Value: "Forbidden Rites", ShortName: "forbiddenrites", IsCurrent: true },
    { Value: "Runes of Aldur", ShortName: "runes", IsCurrent: true },
    { Value: "Future League", ShortName: "future", IsCurrent: true }
  ];
  const league = leagues[0];
  const bundle = buildMarketArtifactBundle({
    snapshot: { ...snapshot(), league: league.Value },
    league,
    leagues: selectPublishedSoftcoreLeagues(leagues, {
      league,
      env: {
        POE2SCOUT_ACTIVE_LEAGUES_JSON: '[" ForbiddenRites "]',
        POE2SCOUT_DEFAULT_LEAGUE_SHORT_NAME: " FORBIDDENRITES "
      }
    }),
    defaultLeagueId: " ForbiddenRites "
  });
  const manifest = JSON.parse(bundle.bodies.manifest);
  assert.equal(bundle.publishRoot, true);
  assert.equal(manifest.defaultLeagueId, "forbiddenrites");
  assert.deepEqual(manifest.availableLeagues, [{
    id: "forbiddenrites",
    name: "Forbidden Rites",
    hardcore: false,
    manifest: { url: "/leagues/forbiddenrites/manifest.json" }
  }]);
  assert.deepEqual(selectPublishedSoftcoreLeagues(leagues, { league, env: {} }), leagues);
});

test("configured publication rejects missing, expired, and hardcore economies", () => {
  const league = { Value: "Forbidden Rites", ShortName: "forbiddenrites", IsCurrent: true };
  const leagues = [
    league,
    { Value: "Runes of Aldur", ShortName: "runes", IsCurrent: false },
    { Value: "HC Forbidden Rites", ShortName: "forbiddenriteshc", IsCurrent: true }
  ];
  for (const id of ["missing", "runes", "forbiddenriteshc"]) {
    assert.throws(() => selectPublishedSoftcoreLeagues(leagues, {
      league,
      env: { POE2SCOUT_ACTIVE_LEAGUES_JSON: JSON.stringify(["forbiddenrites", id]) }
    }), /not a current softcore league/);
  }
});

test("configured publication must include both the selected and default economy", () => {
  const leagues = [
    { Value: "Forbidden Rites", ShortName: "forbiddenrites", IsCurrent: true },
    { Value: "Runes of Aldur", ShortName: "runes", IsCurrent: true }
  ];
  for (const configured of [["forbiddenrites"], ["runes"]]) {
    assert.throws(() => selectPublishedSoftcoreLeagues(leagues, {
      league: leagues[1],
      env: { POE2SCOUT_ACTIVE_LEAGUES_JSON: JSON.stringify(configured) }
    }), /must include league/);
  }
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
    league: { Value: "Runes of Aldur", ShortName: "runes" },
    defaultLeagueId: "runes"
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

test("R2 upload summary points non-default readers at league-scoped artifacts", () => {
  const bundle = buildMarketArtifactBundle({
    snapshot: snapshot(),
    league: { Value: "Runes of Aldur", ShortName: "runes" },
    defaultLeagueId: "forbiddenrites"
  });
  const summary = buildRefreshSummary({
    bundle,
    uploads: [
      { key: bundle.keys.leagueHistory, bytes: 456, cacheControl: "public, max-age=300", historySnapshots: 7, historyWindowHours: 168 },
      { key: bundle.keys.leagueTrendIndex, bytes: 789, cacheControl: "public, max-age=300", trendRoutes: 12, trendSamples: 7 },
      { key: bundle.keys.leagueManifest, bytes: 123, cacheControl: "public, max-age=300" }
    ],
    env: { R2_PUBLIC_BASE_URL: "https://data.example.com/" },
    icons: { count: 2, totalCount: 3, bytes: 5 },
    itemCount: 1
  });

  assert.equal(summary.manifestUrl, "https://data.example.com/leagues/runes/manifest.json");
  assert.equal(summary.statusUrl, "https://data.example.com/leagues/runes/status.json");
  assert.equal(summary.historySnapshots, 7);
  assert.equal(summary.trendSamples, 7);
});

test("concurrent economies publish disjoint objects and only the default updates root", async () => {
  const leagues = [
    { Value: "Forbidden Rites", ShortName: "forbiddenrites", IsCurrent: true },
    { Value: "Runes of Aldur", ShortName: "runes", IsCurrent: true },
    { Value: "HC Forbidden Rites", ShortName: "forbiddenriteshc", IsCurrent: true },
    { Value: "Old League", ShortName: "old", IsCurrent: false },
    { Value: "Future League", ShortName: "future", IsCurrent: true }
  ];
  const writes = new Map();
  const reads = new Map();
  const publishedKeys = new Set();
  for (const league of [leagues[1], leagues[0]]) {
    const bundle = buildMarketArtifactBundle({
      snapshot: { ...snapshot(), league: league.Value, leagueId: league.ShortName },
      league,
      leagues: selectPublishedSoftcoreLeagues(leagues, {
        league,
        env: { POE2SCOUT_ACTIVE_LEAGUES_JSON: '["forbiddenrites","runes"]' }
      }),
      defaultLeagueId: "forbiddenrites"
    });
    const sent = [];
    const fetched = [];
    await uploadMarketArtifacts(bundle, {
      env: { R2_BUCKET_NAME: "bucket" },
      client: {
        async send(command) {
          if ("Body" in command.input) {
            if (command.input.Key === "manifest.json") {
              const manifest = JSON.parse(command.input.Body);
              for (const available of manifest.availableLeagues) {
                assert.ok(publishedKeys.has(available.manifest.url.slice(1)));
              }
            }
            publishedKeys.add(command.input.Key);
            sent.push(command.input);
          } else fetched.push(command.input.Key);
          return {};
        }
      }
    });
    writes.set(league.ShortName, sent);
    reads.set(league.ShortName, fetched);
  }
  const defaultWrites = writes.get("forbiddenrites");
  const runesWrites = writes.get("runes");
  const rootManifest = JSON.parse(defaultWrites.find((entry) => entry.Key === "manifest.json").Body);
  assert.equal(rootManifest.activeLeague.id, "forbiddenrites");
  assert.equal(rootManifest.defaultLeagueId, "forbiddenrites");
  assert.deepEqual(rootManifest.availableLeagues, leagues.slice(0, 2).map((league) => ({
    id: league.ShortName,
    name: league.Value,
    hardcore: false,
    manifest: { url: `/leagues/${league.ShortName}/manifest.json` }
  })));
  assert.deepEqual(defaultWrites.filter((entry) => !entry.Key.startsWith("leagues/")).map((entry) => entry.Key).sort(),
    ["history.json", "manifest.json", "seo-summary.json", "status.json", "trend-index.json"]);
  assert.ok(runesWrites.every((entry) => entry.Key.startsWith("leagues/runes/")));
  assert.deepEqual(runesWrites.map((entry) => entry.Key).sort(), [
    "leagues/runes/history.json",
    "leagues/runes/manifest.json",
    "leagues/runes/seo-summary.json",
    "leagues/runes/snapshots/hourly/2026-07-03T14-03-12Z.json",
    "leagues/runes/status.json",
    "leagues/runes/trend-index.json"
  ]);
  assert.ok(defaultWrites.every((entry) => !runesWrites.some((other) => other.Key === entry.Key)));
  for (const [id, sent] of writes) {
    const manifest = JSON.parse(sent.find((entry) => entry.Key === `leagues/${id}/manifest.json`).Body);
    assert.equal(manifest.status.url, `/leagues/${id}/status.json`);
    assert.equal(manifest.trendIndex.url, `/leagues/${id}/trend-index.json`);
    assert.ok(manifest.snapshot.url.startsWith(`/leagues/${id}/snapshots/`));
    assert.deepEqual(reads.get(id), [`leagues/${id}/history.json`]);
  }
});

test("artifact publication rejects a snapshot from a different matrix league", () => {
  assert.throws(() => buildMarketArtifactBundle({
    snapshot: snapshot(),
    league: { Value: "Forbidden Rites", ShortName: "forbiddenrites" }
  }), /snapshot league does not match/);
});
