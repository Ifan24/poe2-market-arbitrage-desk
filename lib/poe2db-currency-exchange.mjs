export const POE2DB_CURRENCY_EXCHANGE_URL = "https://poe2db.tw/Currency_Exchange";

export function assetSlug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
}

export function decodeHtml(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function stripTags(value) {
  return String(value).replace(/<[^>]+>/g, "").trim();
}

export function normalizeName(value) {
  return decodeHtml(stripTags(value))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeExchangeHref(value) {
  const rawValue = decodeHtml(value);
  const pathname = rawValue.startsWith("http") ? new URL(rawValue).pathname : rawValue;
  const parts = pathname
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);

  if (parts.length > 1 && /^[a-z]{2}(?:-[a-z]{2})?$/i.test(parts[0])) {
    parts.shift();
  }

  return parts.join("/");
}

export function getLocalIconPath(category, name) {
  return `/item-icons/${assetSlug(`${category}-${name}`)}.webp`;
}

export function parseCurrencyExchangeRows(html) {
  const start = html.indexOf("<h4>Currency Exchange</h4>");
  const end = html.indexOf("<div class=\"card mb-1\">", start);
  const section = start >= 0 ? html.slice(start, end >= 0 ? end : undefined) : html;
  const rows = [];
  let category = "";
  const tokenPattern =
    /<h5>([^<]+)<\/h5>|<div class="col"><div class="d-flex border-top rounded">([\s\S]*?)<\/div><\/div><\/div>/g;

  for (const match of section.matchAll(tokenPattern)) {
    if (match[1]) {
      category = decodeHtml(stripTags(match[1]));
      continue;
    }

    const block = match[2];
    const iconMatch = block?.match(/<img[^>]+src="([^"]+)"[^>]+alt="([^"]*)"/);
    const nameMatch = block?.match(
      /<div class="flex-grow-1 ms-2 d-flex justify-content-between align-items-center"><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><span>([\d,]+)<\/span>/
    );
    if (!iconMatch || !nameMatch) {
      continue;
    }

    const name = decodeHtml(stripTags(nameMatch[2]));
    const goldCost = Number(nameMatch[3].replace(/,/g, ""));
    rows.push({
      category,
      name,
      normalizedName: normalizeName(name),
      exchangeHref: decodeHtml(nameMatch[1]),
      exchangeHrefKey: normalizeExchangeHref(nameMatch[1]),
      iconUrl: iconMatch[1],
      iconAlt: decodeHtml(iconMatch[2]),
      goldCost: Number.isFinite(goldCost) ? goldCost : 0,
      localIconPath: getLocalIconPath(category, name)
    });
  }

  return rows;
}

export function rowsToGoldCosts(rows) {
  return new Map(rows.map((row) => [row.normalizedName, row.goldCost]));
}

export function rowsToIconSources(rows) {
  return new Map(rows.map((row) => [row.normalizedName, row]));
}
