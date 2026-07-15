import { readFile, writeFile } from "node:fs/promises";

import {
  POE2DB_CURRENCY_EXCHANGE_URL,
  parseCurrencyExchangeRows
} from "../lib/poe2db-currency-exchange.mjs";
import { fetchText } from "../lib/provider-fetch.mjs";
import { POE2DB_CURRENCY_NAME_PAGES } from "../lib/locale.ts";

export { POE2DB_CURRENCY_NAME_PAGES } from "../lib/locale.ts";

function rowsByExchangeHref(rows) {
  const rowsByKey = new Map();
  const duplicateKeys = new Set();

  for (const row of rows) {
    if (!row.exchangeHrefKey) {
      continue;
    }
    if (rowsByKey.has(row.exchangeHrefKey)) {
      duplicateKeys.add(row.exchangeHrefKey);
      continue;
    }
    rowsByKey.set(row.exchangeHrefKey, row);
  }

  return { rowsByKey, duplicateKeys: [...duplicateKeys].sort() };
}

export function buildCurrencyNameMap(sourceRows, localizedRows) {
  const { rowsByKey: localizedByKey, duplicateKeys } = rowsByExchangeHref(localizedRows);
  const names = {};
  const missing = [];
  let localizedMappedCount = 0;

  for (const sourceRow of sourceRows) {
    const localizedRow = localizedByKey.get(sourceRow.exchangeHrefKey);
    if (!localizedRow) {
      missing.push(sourceRow.name);
      names[sourceRow.name] = sourceRow.name;
      continue;
    }
    names[sourceRow.name] = localizedRow.name;
    localizedMappedCount += 1;
  }

  return {
    names,
    diagnostics: {
      sourceCount: sourceRows.length,
      localizedCount: localizedRows.length,
      mappedCount: Object.keys(names).length,
      localizedMappedCount,
      fallbackCount: missing.length,
      missing,
      duplicateKeys
    }
  };
}

function stringifyCurrencyNames(names) {
  const sortedNames = Object.fromEntries(Object.entries(names).sort(([left], [right]) => left.localeCompare(right)));
  return `${JSON.stringify(sortedNames, null, 2)}\n`;
}

async function readExistingCurrencyNames(locale) {
  const file = new URL(`../lib/currency-names.${locale}.json`, import.meta.url);
  return readFile(file, "utf8");
}

async function writeCurrencyNames(locale, names) {
  const file = new URL(`../lib/currency-names.${locale}.json`, import.meta.url);
  await writeFile(file, stringifyCurrencyNames(names));
}

function parseArgs(argv) {
  const flags = new Set(argv.filter((arg) => arg.startsWith("--")));
  const locales = argv.filter((arg) => !arg.startsWith("--"));
  return {
    check: flags.has("--check"),
    dryRun: flags.has("--dry-run") || flags.has("--check"),
    strict: flags.has("--strict"),
    locales: locales.length ? locales : Object.keys(POE2DB_CURRENCY_NAME_PAGES)
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const sourceHtml = await fetchText(POE2DB_CURRENCY_EXCHANGE_URL);
  const sourceRows = parseCurrencyExchangeRows(sourceHtml);
  let hasMismatch = false;

  for (const locale of options.locales) {
    const url = POE2DB_CURRENCY_NAME_PAGES[locale];
    if (!url) {
      throw new Error(`Unsupported currency-name locale: ${locale}`);
    }

    const localizedHtml = await fetchText(url);
    const localizedRows = parseCurrencyExchangeRows(localizedHtml);
    const { names, diagnostics } = buildCurrencyNameMap(sourceRows, localizedRows);
    const output = stringifyCurrencyNames(names);

    if (diagnostics.duplicateKeys.length || (options.strict && diagnostics.missing.length)) {
      throw new Error(
        `${locale} currency-name coverage failed: ${diagnostics.missing.length} missing rows, ${diagnostics.duplicateKeys.length} duplicate keys`
      );
    }

    if (diagnostics.missing.length) {
      console.warn(`${locale} source rows not present on localized POE2DB page: ${diagnostics.missing.join(", ")}`);
    }

    if (options.check) {
      const existing = JSON.parse(await readExistingCurrencyNames(locale));
      if (stringifyCurrencyNames(existing) !== output) {
        console.error(`${locale} currency-name JSON is out of date`);
        hasMismatch = true;
      }
    } else if (!options.dryRun) {
      await writeCurrencyNames(locale, names);
    }

    console.log(
      `${options.dryRun ? "Checked" : "Wrote"} ${locale} currency names: ${diagnostics.localizedMappedCount}/${diagnostics.sourceCount} localized, ${diagnostics.fallbackCount} English fallback`
    );
  }

  if (hasMismatch) {
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
