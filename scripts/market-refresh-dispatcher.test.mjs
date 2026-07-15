import test from "node:test";
import assert from "node:assert/strict";

import { dispatchMarketRefresh } from "../cloudflare/market-refresh-dispatcher/src/index.js";

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
  assert.deepEqual(JSON.parse(calls[0].init.body), { ref: "master" });
});

test("market refresh dispatcher surfaces GitHub dispatch failures", async () => {
  await assert.rejects(
    () =>
      dispatchMarketRefresh(env, async () => new Response("Bad credentials", { status: 401 })),
    /GitHub workflow dispatch failed: 401 Bad credentials/
  );
});
