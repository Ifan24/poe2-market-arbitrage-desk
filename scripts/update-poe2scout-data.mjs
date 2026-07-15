import { mkdir, writeFile } from "node:fs/promises";
import {
  POE2DB_CURRENCY_EXCHANGE_URL,
  assetSlug,
  normalizeName,
  parseCurrencyExchangeRows,
  rowsToGoldCosts,
  rowsToIconSources
} from "../lib/poe2db-currency-exchange.mjs";
import {
  BASE_CURRENCIES,
  asPositiveNumber,
  buildPairRates,
  buildTopOpportunities,
  createMarketSnapshot,
  getCurrencyName,
  priceToExalted
} from "../lib/market-snapshot.mjs";
import { writeMarketDataFiles } from "../lib/market-snapshot-storage.mjs";
import {
  convertImageToWebp,
  fetchBuffer,
  fetchJson,
  fetchText
} from "../lib/provider-fetch.mjs";
import {
  POE2SCOUT_REALM,
  getPoe2ScoutLeagueApiBase,
  selectActiveSoftcoreLeague
} from "../lib/poe2scout-leagues.mjs";

const REALM = POE2SCOUT_REALM;
const OUTPUT_FILE = new URL("../public/poe-ninja-data.js", import.meta.url);
const ICON_DIR = new URL("../public/item-icons/", import.meta.url);
const ICON_PUBLIC_PREFIX = "/item-icons";
const API_BASE = getPoe2ScoutLeagueApiBase({ realm: REALM });
const GOLD_COST_URL = POE2DB_CURRENCY_EXCHANGE_URL;

const FILTERS = {
  minTradeValueDivine: Number(process.env.POE2SCOUT_MIN_VALUE_TRADED_DIVINE || "50"),
  minStock: Number(process.env.POE2SCOUT_MIN_STOCK || "200"),
  minPriceExalted: Number(process.env.POE2SCOUT_MIN_PRICE_EXALTED || "20"),
  maxPriceExalted: Number(process.env.POE2SCOUT_MAX_PRICE_EXALTED || "1000"),
  minRoiPercent: Number(process.env.POE2SCOUT_MIN_ROI_PERCENT || "2"),
  maxRoiPercent: Number(process.env.POE2SCOUT_MAX_ROI_PERCENT || "200")
};

const CATEGORY_LABELS = {
  abyssal: "Abyssal Bones",
  breach: "Catalysts",
  currency: "Currency",
  delirium: "Liquid Emotions",
  expedition: "Expedition",
  fragment: "Fragments",
  gems: "Uncut Gems",
  lineagesupportgems: "Lineage Gems",
  ritual: "Omens",
  rune: "Runes",
  soulcore: "Soul Cores",
  verisium: "Verisium"
};

function getIconExtension(iconUrl) {
  try {
    const extension = new URL(iconUrl).pathname.match(/\.(png|webp|jpg|jpeg)$/i)?.[1]?.toLowerCase();
    return extension ? `.${extension === "jpeg" ? "jpg" : extension}` : ".png";
  } catch {
    return ".png";
  }
}

async function fetchImage(url) {
  return fetchBuffer(url, {
    headers: {
      referer: POE2DB_CURRENCY_EXCHANGE_URL
    },
    attempts: 3
  });
}

async function localizeIcons(rows, iconSources) {
  await mkdir(ICON_DIR, { recursive: true });

  const downloads = new Map();
  for (const row of rows) {
    const poe2dbIcon = iconSources.get(normalizeName(row.name));
    if (poe2dbIcon) {
      downloads.set(poe2dbIcon.localIconPath, poe2dbIcon.iconUrl);
      row.iconUrl = poe2dbIcon.localIconPath;
      continue;
    }

    if (!row.iconUrl || row.iconUrl.startsWith("/")) {
      continue;
    }

    const localPath = `${ICON_PUBLIC_PREFIX}/${assetSlug(`${row.sourceType}-${row.poeId || row.detailsId || row.name}`)}.webp`;
    downloads.set(localPath, row.iconUrl);
    row.iconUrl = localPath;
  }

  await Promise.all(
    [...downloads].map(async ([localPath, sourceUrl]) => {
      const sourceBuffer = await fetchImage(sourceUrl);
      const converted = await convertImageToWebp(sourceBuffer, { fallbackToOriginal: false });
      if (converted) {
        await writeFile(new URL(`../public${localPath}`, import.meta.url), converted);
        return;
      }

      const fallbackPath = localPath.replace(/\.webp$/, getIconExtension(sourceUrl));
      await writeFile(new URL(`../public${fallbackPath}`, import.meta.url), sourceBuffer);
      for (const row of rows) {
        if (row.iconUrl === localPath) {
          row.iconUrl = fallbackPath;
        }
      }
    })
  );

  return { downloaded: downloads.size };
}

async function fetchCurrencyExchangeData() {
  const html = await fetchText(GOLD_COST_URL);
  const rows = parseCurrencyExchangeRows(html);
  const goldCosts = rowsToGoldCosts(rows);
  if (!goldCosts.size) {
    throw new Error(`No gold costs parsed from ${GOLD_COST_URL}`);
  }

  return {
    goldCosts,
    iconSources: rowsToIconSources(rows)
  };
}

function getGoldCost(goldCosts, name) {
  return goldCosts.get(normalizeName(name)) ?? 0;
}

function getBaseRates(league) {
  const divineToExalted = asPositiveNumber(league.DivinePrice);
  const divineToChaos = asPositiveNumber(league.ChaosDivinePrice);
  const chaosToExalted = divineToExalted && divineToChaos ? divineToExalted / divineToChaos : null;

  return {
    "Divine Orb": 1,
    "Chaos Orb": divineToChaos,
    "Exalted Orb": divineToExalted,
    chaosToExalted
  };
}

function getCategoryLabel(apiId) {
  return CATEGORY_LABELS[String(apiId || "").toLowerCase()] || String(apiId || "Other");
}

function getPairSides(pair) {
  const baseApiIds = new Set(BASE_CURRENCIES.map((currency) => currency.poeId));
  const oneApiId = pair.CurrencyOne?.ApiId;
  const twoApiId = pair.CurrencyTwo?.ApiId;

  if (!baseApiIds.has(oneApiId) && baseApiIds.has(twoApiId)) {
    return {
      item: pair.CurrencyOne,
      itemData: pair.CurrencyOneData,
      base: pair.CurrencyTwo,
      baseData: pair.CurrencyTwoData
    };
  }

  if (baseApiIds.has(oneApiId) && !baseApiIds.has(twoApiId)) {
    return {
      item: pair.CurrencyTwo,
      itemData: pair.CurrencyTwoData,
      base: pair.CurrencyOne,
      baseData: pair.CurrencyOneData
    };
  }

  return null;
}

function buildRows(snapshotPairs, baseRates) {
  const rows = new Map();

  for (const pair of snapshotPairs) {
    const sides = getPairSides(pair);
    if (!sides) {
      continue;
    }

    const baseCurrencyName = getCurrencyName(sides.base.ApiId);
    const itemVolumeTraded = asPositiveNumber(sides.itemData?.VolumeTraded);
    const baseVolumeTraded = asPositiveNumber(sides.baseData?.VolumeTraded);
    const price = itemVolumeTraded && baseVolumeTraded ? baseVolumeTraded / itemVolumeTraded : null;
    if (!baseCurrencyName || !price) {
      continue;
    }

    const key = sides.item.ApiId || String(sides.item.ItemId);
    if (!rows.has(key)) {
      const category = getCategoryLabel(sides.item.CategoryApiId);
      rows.set(key, {
        poeId: sides.item.ApiId,
        detailsId: sides.item.ApiId || String(sides.item.ItemId),
        name: sides.item.Text,
        iconUrl: sides.item.IconUrl || "",
        category,
        categoryUrl: sides.item.CategoryApiId || category.toLowerCase(),
        sourceType: sides.item.CategoryApiId || "",
        volume: 0,
        valueTradedExalted: 0,
        highestStock: 0,
        priceExalted: null,
        maxVolumeCurrency: "",
        rates: {},
        priceExaltedByCurrency: {}
      });
    }

    const row = rows.get(key);
    const pairVolume = asPositiveNumber(pair.Volume) ?? 0;
    const valueTraded = asPositiveNumber(sides.itemData?.ValueTraded) ?? pairVolume;
    const highestStock = asPositiveNumber(sides.itemData?.HighestStock) ?? 0;
    const priceExalted = priceToExalted(price, baseCurrencyName, baseRates);
    if (priceExalted === null) {
      continue;
    }

    row.rates[baseCurrencyName] = price;
    row.priceExaltedByCurrency[baseCurrencyName] = priceExalted;
    row.volume = Math.max(row.volume, valueTraded);
    row.valueTradedExalted = Math.max(row.valueTradedExalted, pairVolume, valueTraded);
    row.highestStock = Math.max(row.highestStock, highestStock);
    row.priceExalted = row.priceExalted === null ? priceExalted : Math.min(row.priceExalted, priceExalted ?? row.priceExalted);
    row.maxVolumeCurrency ||= baseCurrencyName;
  }

  return Array.from(rows.values()).filter((row) => Object.keys(row.rates).length > 0);
}

async function main() {
  const [leagues, currencyExchangeData] = await Promise.all([fetchJson(API_BASE), fetchCurrencyExchangeData()]);
  const { goldCosts, iconSources } = currencyExchangeData;
  const league = selectActiveSoftcoreLeague(leagues);
  const baseRates = getBaseRates(league);
  const snapshot = await fetchJson(`${API_BASE}/${league.ShortName}/ExchangeSnapshot`);
  const snapshotPairs = await fetchJson(`${API_BASE}/${league.ShortName}/SnapshotPairs`);
  const allRows = buildRows(snapshotPairs, baseRates);
  const iconStats = await localizeIcons(allRows, iconSources);

  const pairRates = buildPairRates(baseRates);

  const categoryIconUrls = new Map();
  for (const row of allRows) {
    if (row.category && row.iconUrl && !categoryIconUrls.has(row.category)) {
      categoryIconUrls.set(row.category, row.iconUrl);
    }
  }

  const topOpportunities = buildTopOpportunities(allRows, pairRates, FILTERS, baseRates);
  const snapshotData = createMarketSnapshot({
    rows: allRows,
    pairRates,
    league: league.Value,
    source: "poe2scout",
    importedFrom: `poe2scout ${league.Value} official exchange snapshot`,
    filters: FILTERS,
    goldCosts,
    getGoldCost,
    categoryIconUrls,
    topOpportunities,
    extraRoot: {
      goldCostSource: GOLD_COST_URL,
      goldCostsImported: goldCosts.size,
      snapshotEpoch: snapshot.Epoch
    },
    extraState: {
      goldCostSource: GOLD_COST_URL,
      goldCostsImported: goldCosts.size,
      minVolumePrimaryValue: FILTERS.minTradeValueDivine
    }
  });

  await writeMarketDataFiles(snapshotData, { dataFile: OUTPUT_FILE });
  console.log(`Wrote ${OUTPUT_FILE.pathname}`);
  console.log(`Snapshot epoch: ${snapshot.Epoch}`);
  console.log(`League: ${league.Value} (${league.ShortName})`);
  console.log(`Filters: ${JSON.stringify(FILTERS)}`);
  console.log(`Gold costs: ${goldCosts.size}`);
  console.log(`Downloaded or updated icons: ${iconStats.downloaded}`);
  console.log(`Targets: ${snapshotData.state.targets.length}, opportunities: ${topOpportunities.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
