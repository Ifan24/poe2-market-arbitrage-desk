import { getLocaleRoute, type Locale } from "./locale.ts";

export function encodeTrendRouteKey(routeKey: string) {
  return encodeURIComponent(routeKey);
}

export function decodeTrendRouteKey(routeKeySlug: string) {
  try {
    return decodeURIComponent(routeKeySlug);
  } catch {
    return "";
  }
}

export function getTrendRouteHref(locale: Locale, routeKey: string) {
  return `/${getLocaleRoute(locale)}/routes/${encodeTrendRouteKey(routeKey)}`;
}
