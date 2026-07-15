import { mkdir, writeFile } from "node:fs/promises";
import {
  POE2DB_CURRENCY_EXCHANGE_URL,
  parseCurrencyExchangeRows
} from "../lib/poe2db-currency-exchange.mjs";
import {
  convertImageToWebp,
  fetchBuffer,
  fetchText
} from "../lib/provider-fetch.mjs";

function fetchImage(url) {
  return fetchBuffer(url, {
    headers: {
      referer: POE2DB_CURRENCY_EXCHANGE_URL
    },
    attempts: 3
  });
}

async function main() {
  const html = await fetchText(POE2DB_CURRENCY_EXCHANGE_URL);
  const rows = parseCurrencyExchangeRows(html);
  const uniqueRows = new Map(rows.map((row) => [row.localIconPath, row]));

  await mkdir(new URL("../public/item-icons/", import.meta.url), { recursive: true });

  let downloaded = 0;
  for (const row of uniqueRows.values()) {
    const sourceBuffer = await fetchImage(row.iconUrl);
    const iconBuffer = await convertImageToWebp(sourceBuffer);
    await writeFile(new URL(`../public${row.localIconPath}`, import.meta.url), iconBuffer);
    downloaded += 1;
  }

  console.log(`Downloaded or updated ${downloaded} POE2DB currency exchange icons`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
