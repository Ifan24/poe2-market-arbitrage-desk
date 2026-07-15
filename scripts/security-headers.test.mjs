import test from "node:test";
import assert from "node:assert/strict";

import nextConfig from "../next.config.ts";

test("all routes receive the public security header baseline", async () => {
  const rules = await nextConfig.headers();
  assert.equal(rules.length, 1);
  assert.equal(rules[0].source, "/(.*)");

  const headers = new Map(rules[0].headers.map(({ key, value }) => [key, value]));
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(headers.get("X-Frame-Options"), "DENY");
  assert.equal(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(headers.get("Permissions-Policy"), "camera=(), geolocation=(), microphone=()");
  assert.match(headers.get("Content-Security-Policy"), /frame-ancestors 'none'/);
  assert.match(headers.get("Content-Security-Policy"), /object-src 'none'/);
  assert.match(headers.get("Content-Security-Policy"), /base-uri 'self'/);
});
