import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getLocaleFromAcceptLanguage, getLocaleRoute } from "@/lib/locale";

export const dynamic = "force-dynamic";

export default async function Home() {
  const requestHeaders = await headers();
  const initialLocale = getLocaleFromAcceptLanguage(requestHeaders.get("accept-language"));

  redirect(`/${getLocaleRoute(initialLocale)}`);
}
