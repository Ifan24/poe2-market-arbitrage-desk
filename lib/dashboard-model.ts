import type { MarketItem, MarketState } from "./market-data.ts";
import {
  type BestCurrencySide,
  filterTargetResults,
  getBestBuyCurrencyOptions,
  getBestSellCurrencyOptions,
  getCurrencyModes,
  getTargetResults,
  sortTargetResults,
  type MarketFilters,
  type MarketRoute,
  type ResultFilterOptions,
  type TargetResult
} from "./market-arbitrage.ts";

export type TargetOption = {
  id: string;
  item: MarketItem;
};

export type RoutedTargetResult = {
  result: TargetResult;
  mode: MarketRoute;
};

export type DashboardModelInput = {
  state: MarketState;
  selectedModeKey: string;
  selectedTag: string;
  selectedBestBuyItemId: string;
  bestCurrencySide: BestCurrencySide;
  search: string;
  sortKey: string;
  favoritesOnly: boolean;
  favoriteItemIds: string[];
  marketFilters: MarketFilters;
  page: number;
  pageSize: number;
  allRouteKey: string;
  formatItemName: (item: Pick<MarketItem, "name">) => string;
  formatTag: (tag: string | undefined) => string;
};

export function buildDashboardModel(input: DashboardModelInput) {
  const {
    state,
    selectedModeKey,
    selectedTag,
    selectedBestBuyItemId,
    bestCurrencySide,
    search,
    sortKey,
    favoritesOnly,
    favoriteItemIds,
    marketFilters,
    page,
    pageSize,
    allRouteKey,
    formatItemName,
    formatTag
  } = input;

  const currencyItems = state.items.filter((item) => item.category === "currency");
  const currencyModes = getCurrencyModes(state.items, state.pairs);
  const selectedMode =
    selectedModeKey === allRouteKey
      ? undefined
      : currencyModes.find((mode) => mode.key === selectedModeKey) || currencyModes[0];
  const isAllRoutes = selectedModeKey === allRouteKey;
  const tags = Array.from(new Set(state.targets.map((target) => target.tag).filter(Boolean))).sort() as string[];
  const targetOptions = getTargetOptions(state, formatItemName);
  const bestBuyItemId = selectedBestBuyItemId || targetOptions[0]?.item.id || "";
  const bestBuyCandidates =
    bestCurrencySide === "sell"
      ? getBestSellCurrencyOptions(state, bestBuyItemId)
      : getBestBuyCurrencyOptions(state, bestBuyItemId);

  const resultFilterOptions: ResultFilterOptions = {
    query: search.trim().toLowerCase(),
    favoriteSet: new Set(favoriteItemIds),
    selectedTag,
    favoritesOnly,
    marketFilters,
    pairs: state.pairs,
    formatItemName,
    formatTag
  };

  const activeModes = selectedMode ? [selectedMode] : currencyModes;
  const routedResults = buildRoutedResults({
    state,
    modes: activeModes,
    resultFilterOptions,
    sortKey,
    formatItemName
  });
  const pageCount = Math.max(1, Math.ceil(routedResults.length / pageSize));
  const normalizedPage = Math.min(Math.max(1, page), pageCount);
  const pagedResults = routedResults.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize);
  const overviewResults = activeModes
    .flatMap((overviewMode) =>
      filterTargetResults(getTargetResults(state, overviewMode), resultFilterOptions).map((result) => ({
        result,
        mode: overviewMode
      }))
    )
    .sort((a, b) => b.result.roi - a.result.roi)
    .slice(0, 6);

  return {
    currencyItems,
    currencyModes,
    selectedMode,
    isAllRoutes,
    tags,
    targetOptions,
    bestBuyItemId,
    bestBuyCandidates,
    resultFilterOptions,
    routedResults,
    pagedResults,
    pageCount,
    normalizedPage,
    profitableCount: routedResults.filter(({ result }) => result.roi > 0).length,
    bestRoi: routedResults.reduce((currentBest, { result }) => Math.max(currentBest, result.roi), 0),
    bestVolume: Math.max(0, ...routedResults.map(({ result }) => result.volume)),
    overviewResults
  };
}

function getTargetOptions(
  state: MarketState,
  formatItemName: (item: Pick<MarketItem, "name">) => string
): TargetOption[] {
  const itemsById = new Map(state.items.map((item) => [item.id, item]));
  return state.targets
    .map((target) => {
      const item = itemsById.get(target.itemId);
      return item ? { id: target.id, item } : null;
    })
    .filter((option): option is TargetOption => Boolean(option))
    .sort((a, b) => formatItemName(a.item).localeCompare(formatItemName(b.item)));
}

function buildRoutedResults({
  state,
  modes,
  resultFilterOptions,
  sortKey,
  formatItemName
}: {
  state: MarketState;
  modes: MarketRoute[];
  resultFilterOptions: ResultFilterOptions;
  sortKey: string;
  formatItemName: (item: Pick<MarketItem, "name">) => string;
}): RoutedTargetResult[] {
  const rows: RoutedTargetResult[] = modes.flatMap((mode) =>
    filterTargetResults(getTargetResults(state, mode), resultFilterOptions).map((result) => ({
      result,
      mode
    }))
  );
  const rowByResult = new Map(rows.map((row) => [row.result, row]));

  return sortTargetResults(
    rows.map((row) => row.result),
    sortKey,
    formatItemName
  ).map((result) => rowByResult.get(result)!);
}
