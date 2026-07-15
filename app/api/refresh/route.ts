import { NextResponse } from "next/server";

import {
  HOSTED_REFRESH_DISABLED_MESSAGE,
  HOSTED_REFRESH_UNAUTHORIZED_MESSAGE,
  isHostedRuntimeRefreshAuthorized,
  isHostedRuntimeRefreshDisabled
} from "@/lib/hosted-refresh-policy";
import { refreshMarketData } from "@/lib/market-refresh.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "poe2-next-refresh",
    writableRuntime: !isHostedRuntimeRefreshDisabled()
  });
}

export async function POST(request: Request) {
  if (isHostedRuntimeRefreshDisabled()) {
    return NextResponse.json(
      {
        ok: false,
        message: HOSTED_REFRESH_DISABLED_MESSAGE
      },
      { status: 409 }
    );
  }

  if (!isHostedRuntimeRefreshAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json(
      {
        ok: false,
        message: HOSTED_REFRESH_UNAUTHORIZED_MESSAGE
      },
      { status: 401 }
    );
  }

  try {
    return NextResponse.json(await refreshMarketData());
  } catch (error) {
    console.error("Market refresh failed", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Market refresh failed. Check the server logs for details."
      },
      { status: 500 }
    );
  }
}
