export const BASE_CURRENCIES = [
  { id: "cur-chaos-orb", poeId: "chaos", name: "Chaos Orb", iconUrl: "/currency-icons/chaos-orb.webp" },
  { id: "cur-divine-orb", poeId: "divine", name: "Divine Orb", iconUrl: "/currency-icons/divine-orb.webp" },
  { id: "cur-exalted-orb", poeId: "exalted", name: "Exalted Orb", iconUrl: "/currency-icons/exalted-orb.webp" }
];

export function slug(value, prefix) {
  return `${prefix}-${String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72)}`;
}

export function asPositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function formatRate(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  return Number(value.toPrecision(12)).toString();
}

export function formatVolume(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "--";
  }

  if (parsed >= 1000) {
    return `${Number((parsed / 1000).toPrecision(3))}k`;
  }

  return Number(parsed.toPrecision(3)).toString();
}

export function getCurrencyName(apiId) {
  return BASE_CURRENCIES.find((currency) => currency.poeId === apiId)?.name || "";
}

export function getCurrencyIds() {
  return Object.fromEntries(BASE_CURRENCIES.map((base) => [base.name, base.id]));
}

export function priceToExalted(price, currencyName, baseRates) {
  if (!price) {
    return null;
  }

  if (currencyName === "Exalted Orb") {
    return price;
  }

  if (currencyName === "Divine Orb") {
    return price * baseRates["Exalted Orb"];
  }

  if (currencyName === "Chaos Orb") {
    return price * baseRates.chaosToExalted;
  }

  return null;
}

export function conversionRate(pairRates, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) {
    return 1;
  }

  const direct = pairRates.find((pair) => pair.base === fromCurrency && pair.quote === toCurrency);
  if (direct) {
    return direct.rate;
  }

  const reverse = pairRates.find((pair) => pair.base === toCurrency && pair.quote === fromCurrency);
  if (reverse) {
    return 1 / reverse.rate;
  }

  return null;
}

export function buildPairRates(baseRates) {
  return [
    { base: "Divine Orb", quote: "Chaos Orb", rate: baseRates["Chaos Orb"] },
    { base: "Chaos Orb", quote: "Exalted Orb", rate: baseRates.chaosToExalted },
    { base: "Divine Orb", quote: "Exalted Orb", rate: baseRates["Exalted Orb"] }
  ].filter((pair) => Number.isFinite(pair.rate) && pair.rate > 0);
}

export function buildTopOpportunities(rows, pairRates, filters = {}, baseRates = {}) {
  const opportunities = [];
  const minValueTradedExalted = Number(filters.minTradeValueDivine || 0) * Number(baseRates["Exalted Orb"] || 0);
  const minStock = Number(filters.minStock || 0);
  const minPriceExalted = Number(filters.minPriceExalted || 0);
  const maxPriceExalted = Number(filters.maxPriceExalted || Number.POSITIVE_INFINITY);
  const minRoiPercent = Number(filters.minRoiPercent || Number.NEGATIVE_INFINITY);
  const maxRoiPercent = Number(filters.maxRoiPercent || Number.POSITIVE_INFINITY);

  for (const row of rows) {
    const valueTradedExalted = row.valueTradedExalted ?? row.volume ?? 0;
    if (valueTradedExalted < minValueTradedExalted || (row.highestStock ?? 0) < minStock) {
      continue;
    }

    const currencies = Object.keys(row.rates);
    for (const buyCurrency of currencies) {
      for (const sellCurrency of currencies) {
        if (buyCurrency === sellCurrency) {
          continue;
        }

        const buyPrice = row.rates[buyCurrency];
        const sellPrice = row.rates[sellCurrency];
        const buyPriceExalted = row.priceExaltedByCurrency?.[buyCurrency];
        const sellPriceExalted = row.priceExaltedByCurrency?.[sellCurrency];
        if (
          Number.isFinite(buyPriceExalted) &&
          (buyPriceExalted < minPriceExalted || buyPriceExalted > maxPriceExalted)
        ) {
          continue;
        }
        if (
          Number.isFinite(sellPriceExalted) &&
          (sellPriceExalted < minPriceExalted || sellPriceExalted > maxPriceExalted)
        ) {
          continue;
        }

        const sellToBuyRate = conversionRate(pairRates, sellCurrency, buyCurrency);
        if (!sellToBuyRate) {
          continue;
        }

        const revenue = sellPrice * sellToBuyRate;
        const roi = ((revenue - buyPrice) / buyPrice) * 100;
        if (!Number.isFinite(roi) || roi < minRoiPercent || roi > maxRoiPercent) {
          continue;
        }

        opportunities.push({
          name: row.name,
          category: row.category,
          buyCurrency,
          sellCurrency,
          buyPrice,
          sellPrice,
          roi,
          volume: formatVolume(valueTradedExalted),
          change: row.changeText || `stock ${formatVolume(row.highestStock)}`,
          maxVolumeCurrency: row.maxVolumeCurrency
        });
      }
    }
  }

  return opportunities.sort((a, b) => b.roi - a.roi).slice(0, 80);
}

export function createMarketSnapshot({
  rows,
  pairRates,
  league,
  source,
  importedFrom,
  filters,
  categories,
  goldCosts,
  getGoldCost = () => 0,
  categoryIconUrls = new Map(),
  topOpportunities,
  extraRoot = {},
  extraState = {}
}) {
  const currencyIds = getCurrencyIds();
  const resolvedCategories =
    categories ||
    Array.from(new Set(rows.map((row) => row.category))).sort().map((title) => ({
      title,
      url: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      type: title,
      iconUrl: categoryIconUrls.get(title) || ""
    }));

  const items = [
    ...BASE_CURRENCIES.map((base) => ({
      id: base.id,
      name: base.name,
      category: "currency",
      tag: "Base Currency",
      goldCost: String(getGoldCost(goldCosts, base.name)),
      iconUrl: base.iconUrl
    })),
    ...rows.map((row) => ({
      id: slug(`${row.category}-${row.detailsId || row.poeId}`, "target"),
      name: `${row.name} [${row.category}]`,
      category: "target",
      tag: row.category,
      source: `${source}/${row.categoryUrl}`,
      volume: formatVolume(row.valueTradedExalted ?? row.volume),
      change: row.changeText || `stock ${formatVolume(row.highestStock)}`,
      goldCost: String(getGoldCost(goldCosts, row.name)),
      iconUrl: row.iconUrl,
      tagIconUrl: categoryIconUrls.get(row.category) || row.iconUrl
    }))
  ];

  const targets = rows.map((row) => ({
    id: slug(`${row.category}-${row.detailsId || row.poeId}`, "row"),
    itemId: slug(`${row.category}-${row.detailsId || row.poeId}`, "target"),
    tag: row.category,
    valueTradedExalted: Number.isFinite(row.valueTradedExalted)
      ? Number(row.valueTradedExalted.toPrecision(12))
      : undefined,
    highestStock: Number.isFinite(row.highestStock) ? Number(row.highestStock.toPrecision(12)) : undefined,
    priceExaltedByCurrency: Object.fromEntries(
      Object.entries(row.priceExaltedByCurrency || {})
        .map(([currencyName, price]) => [currencyIds[currencyName], formatRate(price)])
        .filter(([, price]) => price)
    ),
    rates: Object.fromEntries(
      Object.entries(row.rates)
        .map(([currencyName, rate]) => [currencyIds[currencyName], formatRate(rate)])
        .filter(([, rate]) => rate)
    )
  }));

  const pairs = pairRates.map((pair, index) => ({
    id: `pair-${index + 1}`,
    baseItemId: currencyIds[pair.base],
    quoteItemId: currencyIds[pair.quote],
    rate: formatRate(pair.rate)
  }));

  const state = {
    activeTab: "targets",
    selectedModeKey: `${currencyIds["Exalted Orb"]}|${currencyIds["Divine Orb"]}`,
    selectedTag: "all",
    items,
    targets,
    pairs,
    importedFrom,
    importedAt: new Date().toISOString(),
    filters,
    topOpportunities,
    ...extraState
  };

  return {
    league,
    source,
    categories: resolvedCategories,
    filters,
    state,
    topOpportunities,
    ...extraRoot
  };
}
