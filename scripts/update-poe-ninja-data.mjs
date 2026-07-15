import {
  BASE_CURRENCIES,
  asPositiveNumber,
  buildPairRates,
  buildTopOpportunities,
  createMarketSnapshot,
  priceToExalted
} from "../lib/market-snapshot.mjs";
import { writeMarketDataFiles } from "../lib/market-snapshot-storage.mjs";
import { fetchJson } from "../lib/provider-fetch.mjs";

const LEAGUE = "Runes of Aldur";
const API_BASE = "https://poe.ninja/poe2/api/economy/exchange/current/overview";
const OUTPUT_FILE = new URL("../public/poe-ninja-data.js", import.meta.url);
const MIN_VOLUME_PRIMARY_VALUE = Number(process.env.POE_NINJA_MIN_VOLUME_PRIMARY_VALUE || "1");

const VALUE_DISPLAYS = BASE_CURRENCIES.map((base) => base.poeId);

const CATEGORIES = [
  { title: "Currency", url: "currency", type: "Currency" },
  { title: "Fragments", url: "fragments", type: "Fragments" },
  { title: "Abyssal Bones", url: "abyssal-bones", type: "Abyss" },
  { title: "Uncut Gems", url: "uncut-gems", type: "UncutGems" },
  { title: "Lineage Gems", url: "lineage-support-gems", type: "LineageSupportGems" },
  { title: "Essences", url: "essences", type: "Essences" },
  { title: "Soul Cores", url: "soul-cores", type: "SoulCores" },
  { title: "Idols", url: "idols", type: "Idols" },
  { title: "Runes", url: "runes", type: "Runes" },
  { title: "Omens", url: "omens", type: "Ritual" },
  { title: "Expedition", url: "expedition", type: "Expedition" },
  { title: "Liquid Emotions", url: "liquid-emotions", type: "Delirium" },
  { title: "Catalysts", url: "breach-catalyst", type: "Breach" },
  { title: "Verisium", url: "verisium", type: "Verisium" }
];

async function fetchCategory(category, valueDisplay) {
  const url = new URL(API_BASE);
  url.searchParams.set("league", LEAGUE);
  url.searchParams.set("type", category.type);
  if (valueDisplay) {
    url.searchParams.set("value", valueDisplay);
  }

  return fetchJson(url, { label: `poe.ninja ${category.title}` });
}

function extractCoreRates(data) {
  const divineToChaos = asPositiveNumber(data.core?.rates?.chaos);
  const divineToExalted = asPositiveNumber(data.core?.rates?.exalted);

  return {
    "Divine Orb": 1,
    "Chaos Orb": divineToChaos,
    "Exalted Orb": divineToExalted,
    chaosToExalted: divineToExalted && divineToChaos ? divineToExalted / divineToChaos : null
  };
}

function addRate(rates, currencyName, value) {
  const rate = asPositiveNumber(value);
  if (!rate || !currencyName) {
    return;
  }

  rates[currencyName] = rate;
}

function convertFromDivine(divineValue, coreRates, currencyName) {
  if (currencyName === "Divine Orb") {
    return divineValue;
  }

  const conversion = coreRates[currencyName];
  return conversion ? divineValue * conversion : null;
}

function buildRows(category, views, fallbackCoreRates) {
  const rowsById = new Map();

  for (const view of views) {
    const data = view.data;
    const coreRates = view.rates || fallbackCoreRates;
    const itemById = new Map((data.items || []).map((item) => [item.id, item]));

    for (const line of data.lines || []) {
      const item = itemById.get(line.id);
      if (!item) {
        continue;
      }

      const key = item.detailsId || item.id;
      if (!rowsById.has(key)) {
        rowsById.set(key, {
          poeId: item.id,
          detailsId: item.detailsId || item.id,
          name: item.name,
          category: category.title,
          categoryUrl: category.url,
          sourceType: category.type,
          change7d: Number(line.sparkline?.totalChange ?? 0),
          volume: 0,
          maxVolumeCurrency: "",
          valueDisplays: [],
          rates: {},
          priceExaltedByCurrency: {}
        });
      }

      const row = rowsById.get(key);
      row.valueDisplays.push(view.valueDisplay);
      row.change7d = Number(line.sparkline?.totalChange ?? row.change7d);
      row.volume = Math.max(row.volume, asPositiveNumber(line.volumePrimaryValue) ?? 0);

      const divineValue = asPositiveNumber(line.primaryValue);
      if (divineValue) {
        for (const base of BASE_CURRENCIES) {
          const rate = convertFromDivine(divineValue, coreRates, base.name);
          addRate(row.rates, base.name, rate);
          const priceExalted = priceToExalted(rate, base.name, coreRates);
          if (priceExalted !== null) {
            row.priceExaltedByCurrency[base.name] = priceExalted;
          }
        }
      }

      const maxVolumeCurrency = BASE_CURRENCIES.find((base) => base.poeId === line.maxVolumeCurrency);
      const maxVolumeRate = asPositiveNumber(line.maxVolumeRate);
      if (maxVolumeCurrency && maxVolumeRate) {
        const rate = 1 / maxVolumeRate;
        addRate(row.rates, maxVolumeCurrency.name, rate);
        const priceExalted = priceToExalted(rate, maxVolumeCurrency.name, coreRates);
        if (priceExalted !== null) {
          row.priceExaltedByCurrency[maxVolumeCurrency.name] = priceExalted;
        }
        row.maxVolumeCurrency ||= maxVolumeCurrency.name;
      }
    }
  }

  return Array.from(rowsById.values())
    .filter((row) => Object.keys(row.rates).length && row.volume >= MIN_VOLUME_PRIMARY_VALUE)
    .map((row) => ({
      ...row,
      valueDisplays: Array.from(new Set(row.valueDisplays)),
      valueTradedExalted: row.volume,
      highestStock: 0,
      changeText: `${row.change7d >= 0 ? "+" : ""}${Number(row.change7d.toPrecision(3))}%`
    }));
}

async function main() {
  const categoryData = [];
  let coreRates = null;

  for (const category of CATEGORIES) {
    const views = [];
    for (const valueDisplay of VALUE_DISPLAYS) {
      const data = await fetchCategory(category, valueDisplay);
      const rates = extractCoreRates(data);
      coreRates ||= rates;
      views.push({ valueDisplay, data, rates });
    }
    categoryData.push({ category, views });
    const rowCount = Math.max(...views.map((view) => view.data.lines?.length || 0));
    console.log(`${category.title}: ${rowCount} rows, ${views.length} value views`);
  }

  const effectiveCoreRates = coreRates || { "Divine Orb": 1, "Chaos Orb": 1, "Exalted Orb": 1, chaosToExalted: 1 };
  const allRows = categoryData.flatMap(({ category, views }) =>
    buildRows(category, views, effectiveCoreRates)
  );

  const pairRates = buildPairRates(effectiveCoreRates);
  const topOpportunities = buildTopOpportunities(allRows, pairRates);
  const snapshotData = createMarketSnapshot({
    rows: allRows,
    pairRates,
    league: LEAGUE,
    source: "poe.ninja",
    importedFrom: `poe.ninja ${LEAGUE} General (${VALUE_DISPLAYS.join(", ")} value views)`,
    categories: CATEGORIES,
    topOpportunities,
    extraRoot: {
      minVolumePrimaryValue: MIN_VOLUME_PRIMARY_VALUE
    },
    extraState: {
      minVolumePrimaryValue: MIN_VOLUME_PRIMARY_VALUE
    }
  });

  await writeMarketDataFiles(snapshotData, { dataFile: OUTPUT_FILE });
  console.log(`Wrote ${OUTPUT_FILE.pathname}`);
  console.log(`Minimum volumePrimaryValue: ${MIN_VOLUME_PRIMARY_VALUE}`);
  console.log(`Targets: ${snapshotData.state.targets.length}, opportunities: ${topOpportunities.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
