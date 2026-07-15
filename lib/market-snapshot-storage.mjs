import { readFile, writeFile } from "node:fs/promises";

export function getJsonSnapshotFile(dataFile) {
  if (dataFile instanceof URL) {
    return new URL(dataFile.href.replace(/\.js$/i, ".json"));
  }

  return String(dataFile).replace(/\.js$/i, ".json");
}

export function parseMarketDataSnapshot(source, filename = "market snapshot") {
  const text = String(source || "").trim();
  const jsonText = text.startsWith("window.POE_NINJA_DATA")
    ? unwrapBrowserSnapshot(text, filename)
    : text;
  const data = JSON.parse(jsonText);

  if (!data?.state) {
    throw new Error(`Generated market data is missing state in ${filename}`);
  }

  return data;
}

export async function readMarketDataFile(dataFile, { jsonFile = getJsonSnapshotFile(dataFile), preferJson = true } = {}) {
  if (preferJson && jsonFile) {
    try {
      return parseMarketDataSnapshot(await readFile(jsonFile, "utf8"), jsonFile);
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }

  return parseMarketDataSnapshot(await readFile(dataFile, "utf8"), dataFile);
}

export async function writeMarketDataFiles(data, { dataFile, jsonFile = getJsonSnapshotFile(dataFile) }) {
  const json = `${JSON.stringify(data, null, 2)}\n`;
  await writeFile(jsonFile, json, "utf8");
  await writeFile(dataFile, toBrowserSnapshotSource(data), "utf8");
}

export function toBrowserSnapshotSource(data) {
  return `window.POE_NINJA_DATA = ${JSON.stringify(data, null, 2)};\n`;
}

function unwrapBrowserSnapshot(text, filename) {
  const prefix = "window.POE_NINJA_DATA";
  const assignmentStart = text.indexOf(prefix);
  if (assignmentStart === -1) {
    throw new Error(`Generated market data is not valid JSON or a browser snapshot: ${filename}`);
  }

  const equalsIndex = text.indexOf("=", assignmentStart + prefix.length);
  if (equalsIndex === -1) {
    throw new Error(`Generated market data assignment is malformed: ${filename}`);
  }

  let jsonText = text.slice(equalsIndex + 1).trim();
  if (jsonText.endsWith(";")) {
    jsonText = jsonText.slice(0, -1).trim();
  }
  return jsonText;
}
