import type { MarketItem } from "./market-data.ts";
import type { AppreciationAsset, AppreciationSignal, MarketAppreciationIndex } from "./market-appreciation-index.ts";

export type AppreciationRow = {
  key: string;
  asset: AppreciationAsset;
  item: MarketItem | null;
};

const SIGNAL_ORDER: Record<AppreciationSignal, number> = {
  rising: 0,
  stable: 1,
  volatile: 2,
  thin: 3
};

export function buildAppreciationRows(
  appreciation: MarketAppreciationIndex | null | undefined,
  items: MarketItem[]
): AppreciationRow[] {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const rows = Object.values(appreciation?.assets || {}).map((asset) => ({
    key: asset.itemId,
    asset,
    item: itemsById.get(asset.itemId) || null
  }));

  return rows.sort(compareAppreciationRows);
}

export function filterAppreciationRows(rows: AppreciationRow[], query: string, signal: AppreciationSignal | "all") {
  const normalizedQuery = query.trim().toLowerCase();

  return rows
    .filter((row) => signal === "all" || row.asset.signal === signal)
    .filter((row) => {
      if (!normalizedQuery) {
        return true;
      }

      return [row.asset.name, row.asset.category, row.asset.tag]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
}

function compareAppreciationRows(left: AppreciationRow, right: AppreciationRow) {
  return (
    SIGNAL_ORDER[left.asset.signal] - SIGNAL_ORDER[right.asset.signal] ||
    (right.asset.windows["7d"].changePercent ?? -Infinity) - (left.asset.windows["7d"].changePercent ?? -Infinity) ||
    right.asset.confidence - left.asset.confidence ||
    right.asset.currentVolume - left.asset.currentVolume ||
    left.asset.name.localeCompare(right.asset.name)
  );
}
