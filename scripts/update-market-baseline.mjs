import { writeFile } from "node:fs/promises";
import { readMarketDataFile } from "../lib/market-snapshot-storage.mjs";

const SOURCE_FILE = new URL("../public/poe-ninja-data.js", import.meta.url);
const BASELINE_FILE = new URL("../public/market-baseline.json", import.meta.url);

export function createMarketBaseline(snapshot) {
  const generatedAt = snapshot?.state?.importedAt || snapshot?.generatedAt || new Date().toISOString();
  const {
    schemaVersion: _schemaVersion,
    role: _role,
    generatedAt: _generatedAt,
    ...marketData
  } = snapshot;

  return {
    schemaVersion: 1,
    role: "baseline",
    generatedAt,
    ...marketData
  };
}

async function main() {
  const snapshot = await readMarketDataFile(SOURCE_FILE);
  const baseline = createMarketBaseline(snapshot);
  await writeFile(BASELINE_FILE, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  console.log(`Wrote ${BASELINE_FILE.pathname}`);
  console.log(`Baseline generated at: ${baseline.generatedAt}`);
  console.log(`League: ${baseline.league || "unknown"}`);
  console.log(`Targets: ${baseline.state.targets.length}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
