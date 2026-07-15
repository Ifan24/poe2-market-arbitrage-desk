import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { buildMarketSeoSummary } from "./market-seo-summary.ts";
import { buildMarketTrendIndex } from "./market-trend-index.ts";

const REFRESH_INTERVAL_MINUTES = 60;
const STALE_AFTER_MINUTES = 90;
const VERY_STALE_AFTER_MINUTES = 240;
const HISTORY_WINDOW_HOURS = 24 * 7;
const TREND_INDEX_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=600";
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const DEFAULT_ICON_UPLOAD_CONCURRENCY = 24;
const ICON_MANIFEST_KEY = "item-icons/manifest.json";

function requireEnv(name, env = process.env) {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required R2 environment variable: ${name}`);
  }
  return value;
}

function createR2Client(env = process.env) {
  const accountId = requireEnv("R2_ACCOUNT_ID", env);
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID", env),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY", env)
    }
  });
}

function toR2Timestamp(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/:/g, "-");
}

function jsonBody(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function byteLength(value) {
  return Buffer.byteLength(value, "utf8");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function bodyToText(body) {
  if (!body) {
    return "";
  }
  if (typeof body === "string") {
    return body;
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body).toString("utf8");
  }
  if (typeof body.transformToString === "function") {
    return body.transformToString();
  }

  const chunks = [];
  for await (const chunk of body) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function normalizePublicBaseUrl(value) {
  return value ? value.replace(/\/+$/, "") : "";
}

function normalizeObjectPath(value) {
  return value.split(sep).join("/");
}

function getContentType(pathname) {
  if (pathname.endsWith(".webp")) {
    return "image/webp";
  }
  if (pathname.endsWith(".png")) {
    return "image/png";
  }
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (pathname.endsWith(".svg")) {
    return "image/svg+xml";
  }
  return "application/octet-stream";
}

function isMissingObjectError(error) {
  return error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404;
}

function toSnapshotEntry(entry) {
  if (!entry?.key || !entry?.generatedAt) {
    return null;
  }

  const generatedAt = new Date(entry.generatedAt);
  if (Number.isNaN(generatedAt.valueOf())) {
    return null;
  }

  return {
    key: entry.key,
    url: entry.url || `/${entry.key}`,
    generatedAt: generatedAt.toISOString()
  };
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}

async function eachWithConcurrency(items, concurrency, handler) {
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async (_, workerIndex) => {
    for (let index = workerIndex; index < items.length; index += concurrency) {
      await handler(items[index], index);
    }
  });

  await Promise.all(workers);
}

export function buildMarketArtifactBundle({
  snapshot,
  league,
  provider = "poe2scout",
  realm = "poe2",
  now = new Date()
}) {
  const leagueId = league.ShortName;
  const leagueName = league.Value;
  const generatedAt = snapshot?.state?.importedAt || now.toISOString();
  const timestamp = toR2Timestamp(new Date(generatedAt));
  const snapshotKey = `leagues/${leagueId}/snapshots/hourly/${timestamp}.json`;
  const snapshotPath = `/${snapshotKey}`;
  const seoSummary = buildMarketSeoSummary(snapshot, {
    leagueId,
    leagueName
  });
  const manifest = {
    schemaVersion: 1,
    provider,
    realm,
    activeLeague: {
      id: leagueId,
      name: leagueName,
      hardcore: false
    },
    generatedAt,
    expectedRefreshIntervalMinutes: REFRESH_INTERVAL_MINUTES,
    staleAfterMinutes: STALE_AFTER_MINUTES,
    veryStaleAfterMinutes: VERY_STALE_AFTER_MINUTES,
    snapshot: {
      url: snapshotPath,
      contentType: "application/json"
    }
  };
  const status = {
    ok: true,
    lastSuccessfulAt: generatedAt,
    lastAttemptAt: now.toISOString(),
    activeLeague: {
      id: leagueId,
      name: leagueName
    },
    provider,
    message: "Market data refreshed successfully"
  };

  return {
    manifest,
    status,
    snapshotKey,
    keys: {
      rootManifest: "manifest.json",
      rootStatus: "status.json",
      rootSeoSummary: "seo-summary.json",
      rootHistory: "history.json",
      rootTrendIndex: "trend-index.json",
      leagueManifest: `leagues/${leagueId}/manifest.json`,
      leagueStatus: `leagues/${leagueId}/status.json`,
      leagueSeoSummary: `leagues/${leagueId}/seo-summary.json`,
      leagueHistory: `leagues/${leagueId}/history.json`,
      leagueTrendIndex: `leagues/${leagueId}/trend-index.json`,
      snapshot: snapshotKey
    },
    bodies: {
      snapshot: jsonBody(snapshot),
      manifest: jsonBody(manifest),
      status: jsonBody(status),
      seoSummary: jsonBody(seoSummary)
    }
  };
}

export function buildSnapshotHistoryIndex({
  previous,
  bundle,
  now = new Date(bundle.manifest.generatedAt),
  windowHours = HISTORY_WINDOW_HOURS
}) {
  const league = bundle.manifest.activeLeague;
  const leagueSnapshotPrefix = `leagues/${league.id}/snapshots/hourly/`;
  const windowMs = windowHours * 60 * 60 * 1000;
  const referenceTime = new Date(bundle.manifest.generatedAt || now).valueOf();
  const cutoff = referenceTime - windowMs;
  const entriesByKey = new Map();

  if (previous?.league?.id === league.id) {
    for (const rawEntry of previous.snapshots || []) {
      const entry = toSnapshotEntry(rawEntry);
      if (!entry || !entry.key.startsWith(leagueSnapshotPrefix)) {
        continue;
      }
      const time = new Date(entry.generatedAt).valueOf();
      if (time >= cutoff) {
        entriesByKey.set(entry.key, entry);
      }
    }
  }

  const currentEntry = toSnapshotEntry({
    key: bundle.keys.snapshot,
    url: bundle.manifest.snapshot.url,
    generatedAt: bundle.manifest.generatedAt
  });
  if (currentEntry) {
    entriesByKey.set(currentEntry.key, currentEntry);
  }

  const snapshots = [...entriesByKey.values()].sort((left, right) => {
    const timeDelta = new Date(left.generatedAt).valueOf() - new Date(right.generatedAt).valueOf();
    return timeDelta || left.key.localeCompare(right.key);
  });

  return {
    schemaVersion: 1,
    league: {
      id: league.id,
      name: league.name
    },
    generatedAt: now.toISOString(),
    windowHours,
    snapshotCount: snapshots.length,
    firstSnapshotAt: snapshots[0]?.generatedAt || null,
    latestSnapshotAt: snapshots.at(-1)?.generatedAt || null,
    snapshots
  };
}

export async function readSnapshotHistoryIndex(key, { env = process.env, client = createR2Client(env) } = {}) {
  const bucket = requireEnv("R2_BUCKET_NAME", env);

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );
    if (!response?.Body) {
      return null;
    }
    const text = await bodyToText(response.Body);
    return text ? JSON.parse(text) : null;
  } catch (error) {
    if (isMissingObjectError(error)) {
      return null;
    }
    throw error;
  }
}

export async function readHistoricalMarketSnapshots(
  history,
  { currentKey, currentSnapshot, env = process.env, client = createR2Client(env) } = {}
) {
  const bucket = requireEnv("R2_BUCKET_NAME", env);
  const snapshots = [];
  const leagueId = history?.league?.id;
  const leagueSnapshotPrefix = leagueId ? `leagues/${leagueId}/snapshots/hourly/` : "";

  for (const entry of history?.snapshots || []) {
    if (!entry?.key || !entry.key.startsWith(leagueSnapshotPrefix)) {
      continue;
    }

    if (entry.key === currentKey) {
      snapshots.push(currentSnapshot);
      continue;
    }

    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: entry.key
        })
      );
      if (!response?.Body) {
        continue;
      }
      const text = await bodyToText(response.Body);
      if (text) {
        snapshots.push(JSON.parse(text));
      }
    } catch (error) {
      if (!isMissingObjectError(error)) {
        throw error;
      }
    }
  }

  return snapshots;
}

export async function uploadMarketArtifacts(bundle, { env = process.env, client = createR2Client(env) } = {}) {
  const bucket = requireEnv("R2_BUCKET_NAME", env);
  const previousHistory = await readSnapshotHistoryIndex(bundle.keys.leagueHistory, { env, client });
  const history = buildSnapshotHistoryIndex({
    previous: previousHistory,
    bundle
  });
  const historyBody = jsonBody(history);
  const currentSnapshot = JSON.parse(bundle.bodies.snapshot);
  const trendSnapshots = await readHistoricalMarketSnapshots(history, {
    currentKey: bundle.keys.snapshot,
    currentSnapshot,
    env,
    client
  });
  const trendIndex = buildMarketTrendIndex({
    snapshots: trendSnapshots,
    league: bundle.manifest.activeLeague
  });
  const trendIndexBody = jsonBody(trendIndex);
  const uploads = [
    {
      key: bundle.keys.snapshot,
      body: bundle.bodies.snapshot,
      cacheControl: IMMUTABLE_CACHE_CONTROL
    },
    {
      key: bundle.keys.leagueSeoSummary,
      body: bundle.bodies.seoSummary,
      cacheControl: TREND_INDEX_CACHE_CONTROL
    },
    {
      key: bundle.keys.rootSeoSummary,
      body: bundle.bodies.seoSummary,
      cacheControl: TREND_INDEX_CACHE_CONTROL
    },
    {
      key: bundle.keys.leagueHistory,
      body: historyBody,
      cacheControl: TREND_INDEX_CACHE_CONTROL
    },
    {
      key: bundle.keys.rootHistory,
      body: historyBody,
      cacheControl: TREND_INDEX_CACHE_CONTROL
    },
    {
      key: bundle.keys.leagueTrendIndex,
      body: trendIndexBody,
      cacheControl: TREND_INDEX_CACHE_CONTROL
    },
    {
      key: bundle.keys.rootTrendIndex,
      body: trendIndexBody,
      cacheControl: TREND_INDEX_CACHE_CONTROL
    },
    {
      key: bundle.keys.leagueManifest,
      body: bundle.bodies.manifest,
      cacheControl: TREND_INDEX_CACHE_CONTROL
    },
    {
      key: bundle.keys.rootManifest,
      body: bundle.bodies.manifest,
      cacheControl: TREND_INDEX_CACHE_CONTROL
    },
    {
      key: bundle.keys.leagueStatus,
      body: bundle.bodies.status,
      cacheControl: "public, max-age=60, stale-while-revalidate=240"
    },
    {
      key: bundle.keys.rootStatus,
      body: bundle.bodies.status,
      cacheControl: "public, max-age=60, stale-while-revalidate=240"
    }
  ];

  for (const upload of uploads) {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: upload.key,
        Body: upload.body,
        ContentType: "application/json; charset=utf-8",
        CacheControl: upload.cacheControl
      })
    );
  }

  return uploads.map((upload) => ({
    key: upload.key,
    bytes: byteLength(upload.body),
    cacheControl: upload.cacheControl,
    ...(upload.key === bundle.keys.leagueHistory
      ? { historySnapshots: history.snapshotCount, historyWindowHours: history.windowHours }
      : {}),
    ...(upload.key === bundle.keys.leagueTrendIndex
      ? { trendRoutes: trendIndex.routeCount, trendSamples: trendIndex.sampleCount }
      : {})
  }));
}

export async function collectIconUploads({ iconDir = "public/item-icons" } = {}) {
  const iconDirStat = await stat(iconDir);
  if (!iconDirStat.isDirectory()) {
    throw new Error(`Item icon path is not a directory: ${iconDir}`);
  }

  const files = await collectFiles(iconDir);
  const uploads = [];

  for (const file of files) {
    const relativePath = normalizeObjectPath(relative(iconDir, file));
    const body = await readFile(file);
    uploads.push({
      key: `item-icons/${relativePath}`,
      body,
      bytes: body.byteLength,
      sha256: sha256(body),
      contentType: getContentType(file),
      cacheControl: IMMUTABLE_CACHE_CONTROL
    });
  }

  uploads.sort((left, right) => left.key.localeCompare(right.key));
  return uploads;
}

async function readIconManifest({ env = process.env, client = createR2Client(env) } = {}) {
  const bucket = requireEnv("R2_BUCKET_NAME", env);

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: ICON_MANIFEST_KEY
      })
    );
    if (!response?.Body) {
      return null;
    }
    const text = await bodyToText(response.Body);
    return text ? JSON.parse(text) : null;
  } catch (error) {
    if (isMissingObjectError(error)) {
      return null;
    }
    throw error;
  }
}

function buildIconManifest(uploads) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    icons: uploads.map(({ key, bytes, sha256, contentType }) => ({
      key,
      bytes,
      sha256,
      contentType
    }))
  };
}

function selectChangedIconUploads(uploads, previousManifest) {
  const previousByKey = new Map((previousManifest?.icons || []).map((icon) => [icon.key, icon]));
  return uploads.filter((upload) => {
    const previous = previousByKey.get(upload.key);
    return !previous || previous.bytes !== upload.bytes || previous.sha256 !== upload.sha256;
  });
}

export async function uploadIconArtifacts({
  iconDir = "public/item-icons",
  concurrency = DEFAULT_ICON_UPLOAD_CONCURRENCY,
  env = process.env,
  client = createR2Client(env)
} = {}) {
  const bucket = requireEnv("R2_BUCKET_NAME", env);
  const uploads = await collectIconUploads({ iconDir });
  const previousManifest = await readIconManifest({ env, client });
  const changedUploads = selectChangedIconUploads(uploads, previousManifest);

  await eachWithConcurrency(changedUploads, concurrency, async (upload) => {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: upload.key,
        Body: upload.body,
        ContentType: upload.contentType,
        CacheControl: upload.cacheControl
      })
    );
  });

  if (changedUploads.length > 0 || !previousManifest) {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: ICON_MANIFEST_KEY,
        Body: jsonBody(buildIconManifest(uploads)),
        ContentType: "application/json; charset=utf-8",
        CacheControl: TREND_INDEX_CACHE_CONTROL
      })
    );
  }

  return {
    count: changedUploads.length,
    totalCount: uploads.length,
    bytes: changedUploads.reduce((total, upload) => total + upload.bytes, 0),
    uploads: changedUploads.map(({ key, bytes, contentType, cacheControl }) => ({
      key,
      bytes,
      contentType,
      cacheControl
    }))
  };
}

export function buildRefreshSummary({ bundle, uploads, env = process.env, itemCount, icons }) {
  const baseUrl = normalizePublicBaseUrl(env.R2_PUBLIC_BASE_URL);
  const manifestUrl = baseUrl ? `${baseUrl}/${bundle.keys.rootManifest}` : bundle.keys.rootManifest;
  const statusUrl = baseUrl ? `${baseUrl}/${bundle.keys.rootStatus}` : bundle.keys.rootStatus;

  return {
    manifestUrl,
    statusUrl,
    generatedAt: bundle.manifest.generatedAt,
    leagueId: bundle.manifest.activeLeague.id,
    leagueName: bundle.manifest.activeLeague.name,
    itemCount,
    icons,
    historySnapshots: uploads.find((upload) => upload.key === bundle.keys.leagueHistory)?.historySnapshots,
    historyWindowHours: uploads.find((upload) => upload.key === bundle.keys.leagueHistory)?.historyWindowHours,
    trendRoutes: uploads.find((upload) => upload.key === bundle.keys.leagueTrendIndex)?.trendRoutes,
    trendSamples: uploads.find((upload) => upload.key === bundle.keys.leagueTrendIndex)?.trendSamples,
    trendBytes: uploads.find((upload) => upload.key === bundle.keys.leagueTrendIndex)?.bytes,
    snapshotKey: bundle.keys.snapshot,
    snapshotBytes: byteLength(bundle.bodies.snapshot),
    uploads
  };
}

export function formatGitHubStepSummary(summary) {
  const rows = summary.uploads
    .map((upload) => `| \`${upload.key}\` | ${upload.bytes} | \`${upload.cacheControl}\` |`)
    .join("\n");

  return [
    "## Market data R2 upload",
    "",
    `- League: ${summary.leagueName} (\`${summary.leagueId}\`)`,
    `- Generated at: ${summary.generatedAt}`,
    `- Items: ${summary.itemCount}`,
    ...(summary.icons
      ? [
          `- Icons: ${summary.icons.count} uploaded, ${summary.icons.totalCount ?? summary.icons.count} tracked (${summary.icons.bytes} bytes uploaded)`
        ]
      : []),
    ...(summary.historySnapshots !== undefined
      ? [`- History coverage: ${summary.historySnapshots} snapshots over ${summary.historyWindowHours} hours`]
      : []),
    ...(summary.trendRoutes !== undefined
      ? [`- Trend index: ok (${summary.trendRoutes} routes, ${summary.trendSamples} samples, ${summary.trendBytes} bytes)`]
      : []),
    `- Snapshot: \`${summary.snapshotKey}\` (${summary.snapshotBytes} bytes)`,
    `- Manifest: ${summary.manifestUrl}`,
    `- Status: ${summary.statusUrl}`,
    "",
    "| Object | Bytes | Cache-Control |",
    "| --- | ---: | --- |",
    rows,
    ""
  ].join("\n");
}
