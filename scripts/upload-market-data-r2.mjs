import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { readMarketDataFile } from "../lib/market-snapshot-storage.mjs";
import { fetchJson } from "../lib/provider-fetch.mjs";
import {
  POE2SCOUT_REALM,
  getPoe2ScoutLeagueApiBase,
  selectActiveSoftcoreLeague
} from "../lib/poe2scout-leagues.mjs";
import {
  buildMarketArtifactBundle,
  buildRefreshSummary,
  formatGitHubStepSummary,
  uploadIconArtifacts,
  uploadMarketArtifacts
} from "../lib/r2-market-artifacts.mjs";

const DATA_FILE = new URL("../public/poe-ninja-data.js", import.meta.url);
const ICON_DIR = fileURLToPath(new URL("../public/item-icons/", import.meta.url));
const API_BASE = getPoe2ScoutLeagueApiBase({ realm: POE2SCOUT_REALM });

async function main() {
  const [snapshot, leagues] = await Promise.all([readMarketDataFile(DATA_FILE), fetchJson(API_BASE)]);
  const league = selectActiveSoftcoreLeague(leagues);
  const bundle = buildMarketArtifactBundle({
    snapshot,
    league,
    provider: "poe2scout",
    realm: POE2SCOUT_REALM
  });
  const icons = await uploadIconArtifacts({ iconDir: ICON_DIR });
  const uploads = await uploadMarketArtifacts(bundle);
  const summary = buildRefreshSummary({
    bundle,
    uploads,
    icons,
    itemCount: snapshot.state.items.length
  });

  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(process.env.GITHUB_STEP_SUMMARY, formatGitHubStepSummary(summary), { flag: "a" });
  }

  console.log(`Uploaded R2 manifest: ${summary.manifestUrl}`);
  console.log(`Uploaded R2 status: ${summary.statusUrl}`);
  console.log(`Uploaded R2 snapshot: ${summary.snapshotKey}`);
  console.log(`Uploaded R2 icons: ${summary.icons.count} files`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
