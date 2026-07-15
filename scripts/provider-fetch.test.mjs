import test from "node:test";
import assert from "node:assert/strict";
import {
  convertImageToWebp,
  fetchBuffer,
  fetchJson,
  fetchText,
  fetchWithRetry
} from "../lib/provider-fetch.mjs";

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init
  });
}

test("provider fetch retries transient failures", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      throw new Error("connect timeout");
    }
    return jsonResponse({ ok: true });
  };

  try {
    const data = await fetchJson("https://example.test/data", { attempts: 2 });
    assert.deepEqual(data, { ok: true });
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("provider fetch does not retry permanent client failures", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response("missing", { status: 404, statusText: "Not Found" });
  };

  try {
    await assert.rejects(
      fetchWithRetry("https://example.test/missing", {}, { attempts: 3 }),
      /404 Not Found/
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("provider fetch reads text and binary responses", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/text")) {
      return new Response("hello");
    }
    return new Response(new Uint8Array([1, 2, 3]));
  };

  try {
    assert.equal(await fetchText("https://example.test/text"), "hello");
    assert.deepEqual([...await fetchBuffer("https://example.test/image")], [1, 2, 3]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("image conversion can fall back to the original buffer", async () => {
  const buffer = Buffer.from("not an image");
  assert.equal(await convertImageToWebp(buffer, { fallbackToOriginal: false }), null);
  assert.equal(await convertImageToWebp(buffer), buffer);
});
