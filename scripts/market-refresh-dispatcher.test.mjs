import test from "node:test";
import assert from "node:assert/strict";

import { dispatchMarketRefresh, getRefreshIntervalHours, isRefreshSlot } from "../cloudflare/market-refresh-dispatcher/src/index.js";

const env = {
  GITHUB_OWNER: "Ifan24",
  GITHUB_REPO: "poe2-market-arbitrage-desk",
  GITHUB_WORKFLOW_ID: "refresh-market-data.yml",
  GITHUB_REF: "master",
  GITHUB_TOKEN: "test-token"
};

test("market refresh dispatcher calls the GitHub workflow dispatch API", async () => {
  const calls = [];
  const result = await dispatchMarketRefresh(env, async (url, init) => {
    calls.push({ url, init });
    return new Response(null, { status: 204 });
  });

  assert.equal(result.ok, true);
  assert.equal(calls[0].url, "https://api.github.com/repos/Ifan24/poe2-market-arbitrage-desk/actions/workflows/refresh-market-data.yml/dispatches");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.headers.authorization, "Bearer test-token");
  assert.equal(calls[0].init.headers["x-github-api-version"], "2022-11-28");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    ref: "master",
    inputs: { refresh_interval_hours: "6" }
  });
});

test("market refresh dispatcher passes the configured interval to the workflow", async () => {
  const calls = [];
  await dispatchMarketRefresh({ ...env, REFRESH_INTERVAL_HOURS: "1" }, async (url, init) => {
    calls.push({ url, init });
    return new Response(null, { status: 204 });
  });

  assert.deepEqual(JSON.parse(calls[0].init.body).inputs, { refresh_interval_hours: "1" });
});

test("hourly cron only dispatches on UTC hours that match the interval", () => {
  assert.equal(getRefreshIntervalHours({}), 6);
  assert.equal(getRefreshIntervalHours({ REFRESH_INTERVAL_HOURS: "3" }), 3);
  assert.equal(getRefreshIntervalHours({ REFRESH_INTERVAL_HOURS: "5" }), 6);

  assert.equal(isRefreshSlot(Date.parse("2026-08-01T06:17:00.000Z"), 6), true);
  assert.equal(isRefreshSlot(Date.parse("2026-08-01T07:17:00.000Z"), 6), false);
  assert.equal(isRefreshSlot(Date.parse("2026-08-01T07:17:00.000Z"), 1), true);
  assert.equal(isRefreshSlot(Date.parse("2026-08-01T09:17:00.000Z"), 3), true);
});

test("market refresh dispatcher surfaces GitHub dispatch failures", async () => {
  await assert.rejects(
    () =>
      dispatchMarketRefresh(env, async () => new Response("Bad credentials", { status: 401 })),
    /GitHub workflow dispatch failed: 401 Bad credentials/
  );
});
