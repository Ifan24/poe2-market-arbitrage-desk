import type { MarketItem } from "./market-data.ts";

const ITEM_ICON_PREFIX = "/item-icons/";

function normalizeAssetBaseUrl(value: string | undefined) {
  return value ? value.replace(/\/+$/, "") : "";
}

function isExternalAssetSrc(src: string) {
  return /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(src) || src.startsWith("data:") || src.startsWith("blob:");
}

export function resolveMarketAssetSrc(src: string) {
  if (!src || isExternalAssetSrc(src) || !src.startsWith(ITEM_ICON_PREFIX)) {
    return src;
  }

  const baseUrl = normalizeAssetBaseUrl(process.env.NEXT_PUBLIC_MARKET_DATA_BASE_URL);
  return baseUrl ? new URL(src, `${baseUrl}/`).toString() : src;
}

export function getCurrencyKind(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("divine")) {
    return "divine";
  }
  if (normalized.includes("exalted")) {
    return "exalted";
  }
  if (normalized.includes("chaos")) {
    return "chaos";
  }
  return "default";
}

export function getCurrencyInitials(name: string) {
  if (name.toLowerCase().includes("exalted")) {
    return "Ex";
  }
  if (name.toLowerCase().includes("divine")) {
    return "Dv";
  }
  if (name.toLowerCase().includes("chaos")) {
    return "Ch";
  }

  return name
    .replace(/\[[^\]]+\]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

export function getCurrencyIconSrc(name: string) {
  const kind = getCurrencyKind(name);
  if (kind === "exalted") {
    return "/currency-icons/exalted-orb.webp";
  }
  if (kind === "divine") {
    return "/currency-icons/divine-orb.webp";
  }
  if (kind === "chaos") {
    return "/currency-icons/chaos-orb.webp";
  }
  return "";
}

export function getItemIconSrc(item: Pick<MarketItem, "iconUrl" | "name">) {
  return item.iconUrl ? resolveMarketAssetSrc(item.iconUrl) : getCurrencyIconSrc(item.name);
}

export function getCategoryIconSrc(item: Pick<MarketItem, "iconUrl" | "tagIconUrl" | "name">) {
  return resolveMarketAssetSrc(item.tagIconUrl || item.iconUrl || getCurrencyIconSrc(item.name));
}
