const GITHUB_API_VERSION = "2022-11-28";
const WORKER_USER_AGENT = "poe2-market-refresh-dispatcher";

function requiredEnv(env, key) {
  const value = env[key];
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

export function getDispatchConfig(env) {
  return {
    owner: env.GITHUB_OWNER || "Ifan24",
    repo: env.GITHUB_REPO || "poe2-market-arbitrage-desk",
    workflowId: env.GITHUB_WORKFLOW_ID || "refresh-market-data.yml",
    ref: env.GITHUB_REF || "master",
    token: requiredEnv(env, "GITHUB_TOKEN")
  };
}

export async function dispatchMarketRefresh(env, fetchImpl = fetch) {
  const { owner, repo, workflowId, ref, token } = getDispatchConfig(env);
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "user-agent": WORKER_USER_AGENT,
      "x-github-api-version": GITHUB_API_VERSION
    },
    body: JSON.stringify({ ref })
  });

  if (response.status === 204) {
    return {
      ok: true,
      owner,
      repo,
      workflowId,
      ref,
      dispatchedAt: new Date().toISOString()
    };
  }

  const message = await response.text();
  throw new Error(`GitHub workflow dispatch failed: ${response.status} ${message}`);
}

function json(data, init) {
  return Response.json(data, {
    headers: {
      "cache-control": "no-store"
    },
    ...init
  });
}

function isAuthorized(request, env) {
  const secret = env.DISPATCH_SECRET;
  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(dispatchMarketRefresh(env));
  },

  async fetch(request, env) {
    if (request.method === "GET") {
      return json({
        ok: true,
        service: "poe2-market-refresh-dispatcher",
        workflowId: env.GITHUB_WORKFLOW_ID || "refresh-market-data.yml",
        ref: env.GITHUB_REF || "master",
        manualDispatchEnabled: Boolean(env.DISPATCH_SECRET)
      });
    }

    if (request.method !== "POST") {
      return json({ ok: false, message: "Method not allowed" }, { status: 405 });
    }

    if (!isAuthorized(request, env)) {
      return json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
      return json(await dispatchMarketRefresh(env));
    } catch (error) {
      return json(
        {
          ok: false,
          message: error instanceof Error ? error.message : String(error)
        },
        { status: 502 }
      );
    }
  }
};
