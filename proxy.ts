import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getLocaleFromAcceptLanguage, getLocaleRoute } from "@/lib/locale";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    const locale = getLocaleFromAcceptLanguage(request.headers.get("accept-language"));
    return NextResponse.redirect(new URL(`/${getLocaleRoute(locale)}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"]
};
