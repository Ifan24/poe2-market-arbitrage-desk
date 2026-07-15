import type { MarketData } from "./market-data";

export function getJsonSnapshotFile(dataFile: string): string;
export function getJsonSnapshotFile(dataFile: URL): URL;
export function parseMarketDataSnapshot(source: string, filename?: string): MarketData;
export function readMarketDataFile(
  dataFile: string,
  options?: {
    jsonFile?: string;
    preferJson?: boolean;
  }
): Promise<MarketData>;
export function writeMarketDataFiles(
  data: MarketData,
  options: {
    dataFile: string | URL;
    jsonFile?: string | URL;
  }
): Promise<void>;
export function toBrowserSnapshotSource(data: MarketData): string;
