import test from "node:test";
import assert from "node:assert/strict";
import {
  HOSTED_REFRESH_DISABLED_MESSAGE,
  isHostedRuntimeRefreshAuthorized,
  isHostedRuntimeRefreshDisabled
} from "../lib/hosted-refresh-policy.ts";

test("runtime refresh is disabled everywhere unless explicitly allowed", () => {
  assert.equal(isHostedRuntimeRefreshDisabled({ VERCEL: "1" }), true);
  assert.equal(
    isHostedRuntimeRefreshDisabled({
      VERCEL: "1",
      MARKET_REFRESH_ALLOW_RUNTIME_WRITE: "1"
    }),
    false
  );
  assert.equal(isHostedRuntimeRefreshDisabled({}), true);
  assert.equal(
    isHostedRuntimeRefreshDisabled({ MARKET_REFRESH_ALLOW_RUNTIME_WRITE: "1" }),
    false
  );
  assert.match(HOSTED_REFRESH_DISABLED_MESSAGE, /disabled by default/);
});

test("runtime refresh requires an explicitly configured bearer token", () => {
  assert.equal(isHostedRuntimeRefreshAuthorized(null, {}), false);
  assert.equal(
    isHostedRuntimeRefreshAuthorized("Bearer wrong", { MARKET_REFRESH_TOKEN: "expected" }),
    false
  );
  assert.equal(
    isHostedRuntimeRefreshAuthorized("Bearer expected", { MARKET_REFRESH_TOKEN: "expected" }),
    true
  );
});
