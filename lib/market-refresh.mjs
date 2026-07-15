import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { readMarketDataFile } from "./market-snapshot-storage.mjs";

export const DEFAULT_REFRESH_COOLDOWN_MS = 15 * 60 * 1000;
export const DEFAULT_SERVER_REFRESH_MINUTE = 17;

let activeRefresh = null;

export function getLatestServerRefreshAt(now = Date.now(), serverRefreshMinute = DEFAULT_SERVER_REFRESH_MINUTE) {
  const latestRefreshAt = new Date(now);
  latestRefreshAt.setMinutes(serverRefreshMinute, 0, 0);

  if (latestRefreshAt.getTime() > now) {
    latestRefreshAt.setHours(latestRefreshAt.getHours() - 1);
  }

  return latestRefreshAt.toISOString();
}

export function getNextServerRefreshAt(now = Date.now(), serverRefreshMinute = DEFAULT_SERVER_REFRESH_MINUTE) {
  const latestRefreshAt = new Date(getLatestServerRefreshAt(now, serverRefreshMinute));
  latestRefreshAt.setHours(latestRefreshAt.getHours() + 1);
  return latestRefreshAt.toISOString();
}

export function getSnapshotFreshness(
  data,
  now = Date.now(),
  cooldownMs = DEFAULT_REFRESH_COOLDOWN_MS,
  serverRefreshMinute = DEFAULT_SERVER_REFRESH_MINUTE
) {
  const importedAt = data?.state?.importedAt;
  const importedAtMs = importedAt ? Date.parse(importedAt) : Number.NaN;
  if (!Number.isFinite(importedAtMs)) {
    return {
      fresh: false,
      importedAt,
      ageMs: null,
      nextRefreshAt: null,
      reason: "stale",
      latestServerRefreshAt: getLatestServerRefreshAt(now, serverRefreshMinute)
    };
  }

  const ageMs = Math.max(0, now - importedAtMs);
  const cooldownUntil = new Date(importedAtMs + cooldownMs).toISOString();
  const latestServerRefreshAt = getLatestServerRefreshAt(now, serverRefreshMinute);
  const coversCurrentServerWindow = importedAtMs >= Date.parse(latestServerRefreshAt);

  if (coversCurrentServerWindow) {
    return {
      fresh: true,
      importedAt,
      ageMs,
      nextRefreshAt: getNextServerRefreshAt(now, serverRefreshMinute),
      reason: "server-window",
      latestServerRefreshAt
    };
  }

  return {
    fresh: ageMs < cooldownMs,
    importedAt,
    ageMs,
    nextRefreshAt: cooldownUntil,
    reason: ageMs < cooldownMs ? "cooldown" : "stale",
    latestServerRefreshAt
  };
}

function runUpdateScript({ projectDir, updateScript }) {
  return new Promise((resolveRefresh, reject) => {
    const child = spawn(process.execPath, [updateScript], {
      cwd: projectDir,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolveRefresh({ stdout, stderr });
        return;
      }

      reject(new Error(stderr || stdout || `Update script exited with ${code}`));
    });
  });
}

export async function refreshMarketData({
  projectDir = process.cwd(),
  updateScript = resolve(projectDir, "scripts/update-poe2scout-data.mjs"),
  dataFile = resolve(projectDir, "public/poe-ninja-data.js"),
  dataJsonFile = resolve(projectDir, "public/poe-ninja-data.json"),
  cooldownMs = DEFAULT_REFRESH_COOLDOWN_MS,
  serverRefreshMinute = DEFAULT_SERVER_REFRESH_MINUTE,
  now = Date.now()
} = {}) {
  if (activeRefresh) {
    return activeRefresh;
  }

  activeRefresh = (async () => {
    const startedAt = new Date(now).toISOString();
    const existingData = await readMarketDataFile(dataFile, { jsonFile: dataJsonFile }).catch(() => null);
    const freshness = getSnapshotFreshness(existingData, now, cooldownMs, serverRefreshMinute);

    if (existingData && freshness.fresh) {
      return {
        ok: true,
        refreshed: false,
        reused: true,
        reason: freshness.reason,
        startedAt,
        finishedAt: new Date().toISOString(),
        cooldownMs,
        snapshotImportedAt: freshness.importedAt,
        nextRefreshAt: freshness.nextRefreshAt,
        log: "",
        data: existingData
      };
    }

    const update = await runUpdateScript({ projectDir, updateScript });
    const data = await readMarketDataFile(dataFile, { jsonFile: dataJsonFile });
    const updatedFreshness = getSnapshotFreshness(data, Date.now(), cooldownMs, serverRefreshMinute);

    return {
      ok: true,
      refreshed: true,
      reused: false,
      reason: "stale",
      startedAt,
      finishedAt: new Date().toISOString(),
      cooldownMs,
      snapshotImportedAt: updatedFreshness.importedAt,
      nextRefreshAt: updatedFreshness.nextRefreshAt,
      log: update.stdout.trim(),
      data
    };
  })().finally(() => {
    activeRefresh = null;
  });

  return activeRefresh;
}
