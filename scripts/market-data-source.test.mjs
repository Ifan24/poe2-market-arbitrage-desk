import test from "node:test";
import assert from "node:assert/strict";

import { getMarketDataSourceConfig } from "../lib/market-data-source.ts";

test("market data source defaults local and production to the public R2 data plane", () => {
  assert.deepEqual(
    getMarketDataSourceConfig({
      NODE_ENV: "development"
    }),
    {
      baseUrl: "https://data.poe2marketdesk.com",
      manifestPath: "/manifest.json",
      statusPath: "/status.json",
      trendIndexPath: "/trend-index.json",
      requireRemote: true
    }
  );
});

test("market data source still accepts explicit public data host overrides", () => {
  assert.deepEqual(
    getMarketDataSourceConfig({
      NODE_ENV: "development",
      NEXT_PUBLIC_MARKET_DATA_BASE_URL: "https://data.example.com/",
      NEXT_PUBLIC_MARKET_DATA_MANIFEST_PATH: "custom-manifest.json",
      NEXT_PUBLIC_MARKET_DATA_STATUS_PATH: "status/custom.json",
      NEXT_PUBLIC_MARKET_TREND_INDEX_PATH: "analytics/trends.json"
    }),
    {
      baseUrl: "https://data.example.com",
      manifestPath: "/custom-manifest.json",
      statusPath: "/status/custom.json",
      trendIndexPath: "/analytics/trends.json",
      requireRemote: true
    }
  );
});
