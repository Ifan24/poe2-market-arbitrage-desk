import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { refreshMarketData } from "../lib/market-refresh.mjs";

const PORT = Number(process.env.POE2_REFRESH_PORT || "17377");
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = resolve(SCRIPT_DIR, "..");

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && request.url === "/api/health") {
    sendJson(response, 200, { ok: true, service: "poe2-local-refresh", port: PORT });
    return;
  }

  if (request.method === "POST" && request.url === "/api/refresh") {
    try {
      sendJson(response, 200, await refreshMarketData({ projectDir: PROJECT_DIR }));
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        message: error instanceof Error ? error.message : String(error)
      });
    }
    return;
  }

  sendJson(response, 404, { ok: false, message: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`POE2 refresh server: http://127.0.0.1:${PORT}`);
  console.log("Keep this window open while using the refresh buttons.");
});
