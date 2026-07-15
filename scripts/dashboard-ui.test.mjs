import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLocaleFromAcceptLanguage, getSupportedLocale } from "../lib/locale.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dashboard = fs.readFileSync(path.join(__dirname, "..", "components", "market-dashboard.tsx"), "utf8");
const landingHelper = fs.readFileSync(path.join(__dirname, "..", "components", "landing-helper-toast.tsx"), "utf8");
const dashboardPreferences = fs.readFileSync(path.join(__dirname, "..", "lib", "dashboard-preferences.ts"), "utf8");
const marketArbitrage = fs.readFileSync(path.join(__dirname, "..", "lib", "market-arbitrage.ts"), "utf8");
const dashboardModel = fs.readFileSync(path.join(__dirname, "..", "lib", "dashboard-model.ts"), "utf8");
const marketDisplay = fs.readFileSync(path.join(__dirname, "..", "components", "market-display.tsx"), "utf8");
const marketSeoSummary = fs.readFileSync(path.join(__dirname, "..", "components", "market-seo-summary.tsx"), "utf8");
const marketTrendsPage = fs.readFileSync(path.join(__dirname, "..", "components", "market-trends-page.tsx"), "utf8");
const marketDisplayPolicy = fs.readFileSync(path.join(__dirname, "..", "lib", "market-display-policy.ts"), "utf8");
const sonner = fs.readFileSync(path.join(__dirname, "..", "components", "ui", "sonner.tsx"), "utf8");
const marketLocale = fs.readFileSync(path.join(__dirname, "..", "lib", "market-locale.ts"), "utf8");
const packageSource = fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8");
const updatePoe2Scout = fs.readFileSync(path.join(__dirname, "..", "scripts", "update-poe2scout-data.mjs"), "utf8");
const updatePoe2dbIcons = fs.readFileSync(path.join(__dirname, "..", "scripts", "update-poe2db-icons.mjs"), "utf8");
const providerFetch = fs.readFileSync(path.join(__dirname, "..", "lib", "provider-fetch.mjs"), "utf8");
const page = fs.readFileSync(path.join(__dirname, "..", "app", "(redirect)", "page.tsx"), "utf8");
const localizedPage = fs.readFileSync(path.join(__dirname, "..", "app", "[locale]", "page.tsx"), "utf8");
const localizedTrendsPage = fs.readFileSync(path.join(__dirname, "..", "app", "[locale]", "trends", "page.tsx"), "utf8");
const redirectLayout = fs.readFileSync(path.join(__dirname, "..", "app", "(redirect)", "layout.tsx"), "utf8");
const localizedLayout = fs.readFileSync(path.join(__dirname, "..", "app", "[locale]", "layout.tsx"), "utf8");
const layout = `${redirectLayout}\n${localizedLayout}`;
const robots = fs.readFileSync(path.join(__dirname, "..", "app", "robots.ts"), "utf8");
const sitemap = fs.readFileSync(path.join(__dirname, "..", "app", "sitemap.ts"), "utf8");
const siteMetadata = fs.readFileSync(path.join(__dirname, "..", "lib", "site-metadata.ts"), "utf8");
const marketDataSource = fs.readFileSync(path.join(__dirname, "..", "lib", "market-data.ts"), "utf8");
const marketDataSourceConfig = fs.readFileSync(path.join(__dirname, "..", "lib", "market-data-source.ts"), "utf8");
const r2MarketArtifacts = fs.readFileSync(path.join(__dirname, "..", "lib", "r2-market-artifacts.mjs"), "utf8");
const marketSeoSummarySource = fs.readFileSync(path.join(__dirname, "..", "lib", "market-seo-summary.ts"), "utf8");
const marketTrendIndexSource = fs.readFileSync(path.join(__dirname, "..", "lib", "market-trend-index.ts"), "utf8");
const trendsModel = fs.readFileSync(path.join(__dirname, "..", "lib", "trends-model.ts"), "utf8");
const poe2ScoutLeagues = fs.readFileSync(path.join(__dirname, "..", "lib", "poe2scout-leagues.mjs"), "utf8");
const localeSource = fs.readFileSync(path.join(__dirname, "..", "lib", "locale.ts"), "utf8");
const proxy = fs.readFileSync(path.join(__dirname, "..", "proxy.ts"), "utf8");
const refreshWorkflow = fs.readFileSync(
  path.join(__dirname, "..", ".github", "workflows", "refresh-market-data.yml"),
  "utf8"
);
const baselineWorkflow = fs.readFileSync(
  path.join(__dirname, "..", ".github", "workflows", "refresh-market-baseline.yml"),
  "utf8"
);
const cloudflareRefreshDispatcher = fs.readFileSync(
  path.join(__dirname, "..", "cloudflare", "market-refresh-dispatcher", "wrangler.jsonc"),
  "utf8"
);
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
const currencyNamesZhTw = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "lib", "currency-names.zh-TW.json"), "utf8")
);
const currencyNamesJa = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "lib", "currency-names.ja.json"), "utf8")
);
const currencyNamesKo = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "lib", "currency-names.ko.json"), "utf8")
);

test("dashboard renders through the shadcn React surface", () => {
  assert.match(localizedPage, /<MarketDashboard initialData=\{marketData\} initialLocale=\{locale\} dataSource=\{bootstrap\.source\} \/>/);
  assert.match(localizedPage, /<MarketSeoSummary summary=\{marketSummary\} locale=\{locale\} \/>/);
  assert.match(localizedPage, /bootstrap\.source\.requireRemote \? toMarketDataShell\(baselineData\) : baselineData/);
  assert.match(dashboard, /@\/components\/market-display/);
  assert.match(dashboard, /@\/components\/ui\/card/);
  assert.match(dashboard, /@\/components\/ui\/tabs/);
  assert.match(dashboard, /@\/components\/ui\/table/);
  assert.match(dashboard, /@\/components\/ui\/select/);
  assert.match(dashboard, /<LandingHelperToast t=\{t\} \/>/);
});

test("dashboard landing help uses one persistent, explicit Sonner prompt", () => {
  assert.match(landingHelper, /toast\.custom/);
  assert.match(landingHelper, /LANDING_HELPER_TOAST_ID/);
  assert.match(landingHelper, /position: "bottom-right"/);
  assert.match(landingHelper, /duration: Infinity/);
  assert.match(landingHelper, /dismissible: false/);
  assert.match(landingHelper, /saveLandingHelperDismissed/);
  assert.match(landingHelper, /<Dialog open=\{guideOpen\}/);
  assert.match(landingHelper, /https:\/\/github\.com\/Ifan24\/poe2-market-arbitrage-desk/);
  assert.doesNotMatch(landingHelper, /<Toaster/);
});

test("localized dashboard routes stay statically renderable", () => {
  assert.doesNotMatch(localizedPage, /dynamic = "force-dynamic"/);
  assert.doesNotMatch(layout, /next\/headers/);
  assert.match(localizedLayout, /getLocaleFromRoute\(routeLocale\) \|\| DEFAULT_LOCALE/);
  assert.match(localizedLayout, /<html lang=\{initialLocale\}>/);
  assert.match(localizedPage, /readMarketDataBootstrap/);
  assert.match(localizedPage, /dataSource=\{bootstrap\.source\}/);
  assert.match(marketDataSource, /export function toPublicMarketData/);
  assert.match(marketDataSourceConfig, /NEXT_PUBLIC_MARKET_DATA_BASE_URL/);
  assert.match(marketDataSourceConfig, /NEXT_PUBLIC_MARKET_TREND_INDEX_PATH/);
  assert.match(marketDataSourceConfig, /market-baseline\.json/);
  assert.match(marketDataSourceConfig, /manifest\.json/);
  assert.match(localizedPage, /buildMarketSeoSummary\(baselineData\)/);
  assert.doesNotMatch(proxy, /x-market-locale/);
  assert.match(proxy, /matcher: \["\/"\]/);
});

test("localized trends page ranks profit persistence separately from the scanner", () => {
  assert.doesNotMatch(localizedTrendsPage, /dynamic = "force-dynamic"/);
  assert.match(
    localizedTrendsPage,
    /<MarketTrendsPage initialData=\{marketData\} initialLocale=\{locale\} dataSource=\{bootstrap\.source\} \/>/
  );
  assert.match(localizedTrendsPage, /getLocalizedPageMetadata\(locale, "trends"\)/);
  assert.match(dashboard, /href=\{trendsHref\}/);
  assert.match(marketTrendsPage, /buildTrendRows/);
  assert.match(marketTrendsPage, /filterTrendRows/);
  assert.match(marketTrendsPage, /normalizeFilters/);
  assert.match(marketTrendsPage, /t\.marketFilters/);
  assert.match(marketTrendsPage, /t\.roiMax/);
  assert.match(marketTrendsPage, /CategoryIcon/);
  assert.match(marketTrendsPage, /tagIconItems/);
  assert.match(marketTrendsPage, /confidenceFilters/);
  assert.match(marketTrendsPage, /ChartContainer/);
  assert.match(marketTrendsPage, /AreaChart/);
  assert.match(marketTrendsPage, /row\.roiSeries/);
  assert.match(marketTrendsPage, /selectedRow/);
  assert.match(marketTrendsPage, /RouteTrendDetailDialog/);
  assert.match(marketTrendsPage, /function DetailDecisionPanel/);
  assert.match(marketTrendsPage, /function getDetailDecision/);
  assert.match(marketTrendsPage, /DialogContent/);
  assert.match(marketTrendsPage, /getTrendRouteInsights/);
  assert.match(marketTrendsPage, /OpportunityFocusCard/);
  assert.match(marketTrendsPage, /filteredRows/);
  assert.match(marketTrendsPage, /trend-insight-\$\{insight\.kind\}/);
  assert.match(marketTrendsPage, /<ItemIcon item=\{insight\.row\.item\} \/>/);
  assert.match(marketTrendsPage, /line-clamp-2 min-w-0 max-w-full break-words/);
  assert.match(marketTrendsPage, /function RouteCell/);
  assert.match(marketTrendsPage, /function CompactRouteLine/);
  assert.match(marketTrendsPage, /function RouteTargetBlock/);
  assert.match(marketTrendsPage, /function MobileMetric/);
  assert.match(marketTrendsPage, /function MobileTrendRouteCard/);
  assert.match(marketTrendsPage, /function ConfidenceCell/);
  assert.match(marketTrendsPage, /function LiquidityCell/);
  assert.match(marketTrendsPage, /data-testid="trend-mobile-route-card"/);
  assert.match(marketTrendsPage, /data-testid="trend-mobile-compact-metrics"/);
  assert.match(marketTrendsPage, /data-testid="trend-mobile-route-details"/);
  assert.match(marketTrendsPage, /data-testid="trend-routes-jump"/);
  assert.match(marketTrendsPage, /id="trend-routes"/);
  assert.match(marketTrendsPage, /data-testid="trend-row-details"/);
  assert.match(marketTrendsPage, /className="grid gap-3 md:hidden"/);
  assert.match(marketTrendsPage, /className="hidden overflow-x-auto md:block"/);
  assert.match(marketTrendsPage, /<TableHead>\{t\.details\}<\/TableHead>/);
  assert.match(marketTrendsPage, /<TableHead>\{t\.trendConfidence\}<\/TableHead>/);
  assert.match(marketTrendsPage, /<TableHead>\{t\.liquidity\}<\/TableHead>/);
  assert.doesNotMatch(marketTrendsPage, /<TableHead>\{t\.persistence24h\}<\/TableHead>/);
  assert.doesNotMatch(marketTrendsPage, /<TableHead>\{t\.persistence7d\}<\/TableHead>/);
  assert.match(trendsModel, /filterTargetResults\(getTargetResults\(state, mode\)/);
  assert.match(trendsModel, /export function getTrendRouteInsights/);
  assert.match(marketTrendIndexSource, /roiSeries/);
  assert.match(marketTrendsPage, /dataSource\.trendIndexPath/);
  assert.match(marketTrendsPage, /t\.trendConfidence/);
  assert.match(marketTrendsPage, /t\.persistence24h/);
  assert.match(marketTrendsPage, /t\.persistence7d/);
  assert.match(marketLocale, /viewRankedRoutes: "View ranked routes"/);
  assert.match(marketLocale, /viewRankedRoutes: "查看排序路線"/);
  assert.match(trendsModel, /getTrendRouteKey\(result\.target\.itemId, mode\.buyCurrencyId, mode\.sellCurrencyId\)/);
  const trendCopy = marketLocale
    .split("\n")
    .filter((line) => /trend[A-Z]|trends:|worthChecking|verifyFirst|thinSignal/.test(line))
    .join("\n");
  assert.doesNotMatch(trendCopy, /R2|bucket|manifest|snapshot|provider/i);
});

test("market display policy stays out of the large dashboard module", () => {
  assert.doesNotMatch(dashboard, /function getCurrencyKind/);
  assert.doesNotMatch(dashboard, /function ItemIcon/);
  assert.match(marketDisplay, /getItemIconSrc/);
  assert.match(marketDisplay, /getCategoryIconSrc/);
  assert.match(marketDisplayPolicy, /getCurrencyIconSrc/);
});

test("dashboard keeps trading filters and round-lot instructions", () => {
  assert.match(marketLocale, /Market filters/);
  assert.match(marketArbitrage, /minTradeValueDivine/);
  assert.match(dashboard, /getIntegerRoiRows/);
  assert.match(dashboard, /getManualPlannerResult/);
  assert.match(dashboard, /DialogContent/);
  assert.match(marketLocale, /Round lots/);
  assert.match(marketLocale, /Buy-side trade/);
  assert.match(marketLocale, /Sell-side trade/);
  assert.match(marketLocale, /buyReceives/);
  assert.match(marketLocale, /sellAmountCalculated/);
  assert.match(dashboard, /manualResult\.buyItemCount/);
  assert.match(dashboard, /manualResult\.sellGetAmount/);
  assert.match(marketLocale, /Buy with .*sell for/s);
  assert.match(marketLocale, /Item quantity is calculated from the current buy price/);
  assert.match(marketLocale, /Sell amount is calculated from the current sell price/);
  assert.doesNotMatch(dashboard, /DeltaBadge/);
  assert.doesNotMatch(marketLocale, /beats snapshot/);
});

test("dashboard defaults to all routes and derives overview from routed filtered results", () => {
  assert.match(marketArbitrage, /buyCurrencyName === "Exalted Orb" && mode\.sellCurrencyName === "Divine Orb"/);
  assert.match(marketArbitrage, /minTradeValueDivine: "50"/);
  assert.match(marketArbitrage, /minStock: "200"/);
  assert.match(dashboardPreferences, /DASHBOARD_STORAGE_KEY = "poe2-shadcn-dashboard:v2"/);
  assert.match(dashboard, /const ALL_ROUTE_KEY = "all-routes"/);
  assert.match(dashboard, /useState\(ALL_ROUTE_KEY\)/);
  assert.match(dashboard, /buildDashboardModel/);
  assert.match(dashboardModel, /const activeModes = selectedMode \? \[selectedMode\] : currencyModes/);
  assert.match(dashboardModel, /filterTargetResults\(getTargetResults\(state, overviewMode\), resultFilterOptions\)/);
  assert.match(dashboardModel, /slice\(0, 6\)/);
  assert.doesNotMatch(dashboard, /topOpportunities\.slice\(0, 3\)/);
});

test("dashboard does not rely on the retired static html renderer", () => {
  assert.doesNotMatch(page, /dashboard\.js/);
  assert.doesNotMatch(dashboard, /innerHTML/);
});

test("dashboard keeps market refresh out of the hosted UI", () => {
  assert.doesNotMatch(dashboard, /fetch\("\/api\/refresh"/);
  assert.doesNotMatch(dashboard, /onClick=\{refreshData\}/);
  assert.doesNotMatch(marketLocale, /Refreshing market data/);
  assert.match(dashboard, /targetsIndexed/);
});

test("dashboard reminds stale tabs around the hourly snapshot refresh window", () => {
  assert.match(refreshWorkflow, /workflow_dispatch:/);
  assert.doesNotMatch(refreshWorkflow, /schedule:/);
  assert.match(cloudflareRefreshDispatcher, /"crons": \["17 \* \* \* \*"\]/);
  assert.match(dashboard, /HOURLY_REFRESH_MINUTE = 17/);
  assert.match(dashboard, /SNAPSHOT_PROMPT_GRACE_MINUTES = 5/);
  assert.match(dashboard, /shouldShowHourlySnapshotReminder/);
  assert.match(dashboard, /loadDismissedSnapshotReminderSlot/);
  assert.match(dashboard, /saveDismissedSnapshotReminderSlot/);
  assert.match(dashboard, /toast\(t\.newSnapshotAvailable/);
  assert.match(dashboard, /SNAPSHOT_REMINDER_TOAST_ID/);
  assert.match(dashboard, /duration: Infinity/);
  assert.match(dashboard, /newSnapshotAvailable/);
  assert.match(dashboard, /window\.location\.reload\(\)/);
  assert.match(layout, /<Toaster \/>/);
  assert.match(sonner, /from "sonner"/);
  assert.match(sonner, /description: "!text-muted-foreground"/);
  assert.match(packageSource, /"sonner"/);
  assert.doesNotMatch(dashboard, /poe-ninja-data\.json\?freshness/);
  assert.doesNotMatch(dashboard, /fetch\(`\/api\/refresh/);
  assert.match(dashboard, /fetchJson<MarketDataManifest>/);
  assert.match(dashboard, /resolveRemoteUrl\(dataSource\.baseUrl, manifest\.snapshot\.url\)/);
});

test("dashboard formats snapshot timestamps in the browser locale", () => {
  assert.match(dashboard, /function LocalSnapshotTime/);
  assert.match(dashboard, /suppressHydrationWarning/);
  assert.match(dashboard, /dateTime=\{value\}/);
  assert.doesNotMatch(dashboard, /\{formatDate\(state\.importedAt, locale, t\)\}/);
});

test("dashboard keeps browser preferences behind a Tauri-replaceable adapter", () => {
  assert.match(dashboardPreferences, /window\.localStorage/);
  assert.match(dashboardPreferences, /window\.sessionStorage/);
  assert.match(dashboardPreferences, /window\.navigator\.language/);
  assert.match(dashboardPreferences, /document\.documentElement\.lang/);
  assert.doesNotMatch(dashboard, /window\.localStorage/);
  assert.doesNotMatch(dashboard, /window\.sessionStorage/);
  assert.doesNotMatch(dashboard, /window\.navigator/);
  assert.doesNotMatch(dashboard, /document\.documentElement/);
});

test("poe2scout refresh keeps checked-in item icons instead of pruning them", () => {
  assert.doesNotMatch(updatePoe2Scout, /\bunlink\b/);
  assert.doesNotMatch(updatePoe2Scout, /pruned stale icons/);
  assert.match(updatePoe2Scout, /Downloaded or updated icons/);
  assert.match(updatePoe2Scout, /rowsToIconSources/);
  assert.match(updatePoe2Scout, /provider-fetch\.mjs/);
  assert.match(updatePoe2dbIcons, /provider-fetch\.mjs/);
  assert.match(providerFetch, /fetchWithRetry/);
  assert.match(packageSource, /update:poe2db-icons/);
  assert.doesNotMatch(refreshWorkflow, /git add public\/poe-ninja-data\.json public\/poe-ninja-data\.js public\/item-icons/);
});

test("market refresh uploads tested artifacts to R2 instead of committing generated data", () => {
  assert.match(refreshWorkflow, /contents: read/);
  assert.match(refreshWorkflow, /Upload market data to R2/);
  assert.match(refreshWorkflow, /npm run upload:market-data:r2/);
  assert.doesNotMatch(refreshWorkflow, /git commit -m "chore: refresh market data"/);
  assert.match(packageSource, /upload:market-data:r2/);
  assert.match(r2MarketArtifacts, /PutObjectCommand/);
  assert.match(r2MarketArtifacts, /uploadIconArtifacts/);
  assert.match(r2MarketArtifacts, /item-icons/);
  assert.match(r2MarketArtifacts, /manifest\.json/);
  assert.match(r2MarketArtifacts, /status\.json/);
  assert.match(r2MarketArtifacts, /seo-summary\.json/);
  assert.match(r2MarketArtifacts, /history\.json/);
  assert.match(r2MarketArtifacts, /trend-index\.json/);
  assert.match(r2MarketArtifacts, /buildMarketSeoSummary/);
  assert.match(r2MarketArtifacts, /buildSnapshotHistoryIndex/);
  assert.match(r2MarketArtifacts, /buildMarketTrendIndex/);
  assert.match(marketTrendIndexSource, /buildMarketAppreciationIndex/);
  assert.match(marketTrendIndexSource, /profitPersistence/);
  assert.match(marketTrendIndexSource, /"24h"/);
  assert.match(marketTrendIndexSource, /"7d"/);
  assert.match(r2MarketArtifacts, /max-age=31536000, immutable/);
  assert.match(poe2ScoutLeagues, /POE2SCOUT_REALM = DEFAULT_REALM/);
  assert.match(poe2ScoutLeagues, /poe2/);
  assert.doesNotMatch(poe2ScoutLeagues, /DEFAULT_REALM = "pc"/);
});

test("localized pages render a compact crawlable market summary", () => {
  assert.match(marketSeoSummarySource, /buildMarketSeoSummary/);
  assert.match(marketSeoSummarySource, /topRoutes/);
  assert.match(marketSeoSummarySource, /topCategories/);
  assert.match(marketSeoSummary, /market-overview-heading/);
  assert.match(marketSeoSummary, /t\.marketOverview/);
  assert.match(marketSeoSummary, /t\.topRoutes/);
  assert.match(marketSeoSummary, /t\.topCategories/);
  assert.doesNotMatch(marketSeoSummary, /R2|bucket|manifest|snapshot|provider/i);
});

test("daily market baseline commits only the static baseline JSON", () => {
  assert.match(packageSource, /update:market-baseline/);
  assert.match(baselineWorkflow, /schedule:/);
  assert.match(baselineWorkflow, /contents: write/);
  assert.match(baselineWorkflow, /npm run update:poe2scout/);
  assert.match(baselineWorkflow, /npm run update:market-baseline/);
  assert.match(baselineWorkflow, /git add public\/market-baseline\.json/);
  assert.match(baselineWorkflow, /chore: refresh market baseline/);
  assert.doesNotMatch(baselineWorkflow, /market-baseline\.js(\s|"|'|$)/);
  assert.doesNotMatch(baselineWorkflow, /git add public\/poe-ninja-data\.json public\/poe-ninja-data\.js/);
  assert.doesNotMatch(refreshWorkflow, /public\/market-baseline\.json/);
});

test("dashboard exposes language switching and poe2db zh-TW currency names", () => {
  assert.match(marketLocale, /LOCALE_OPTIONS/);
  assert.match(dashboard, /switchLocale/);
  assert.match(dashboard, /router\.push/);
  assert.match(marketTrendsPage, /switchLocale/);
  assert.match(marketTrendsPage, /router\.push/);
  assert.match(marketLocale, /formatItemName/);
  assert.equal(currencyNamesZhTw["Exalted Orb"], "崇高石");
  assert.equal(currencyNamesZhTw["Divine Orb"], "神聖石");
  assert.equal(currencyNamesZhTw["Chaos Orb"], "混沌石");
  assert.equal(currencyNamesJa["Exalted Orb"], "高貴なオーブ");
  assert.equal(currencyNamesJa["Divine Orb"], "神のオーブ");
  assert.equal(currencyNamesJa["Chaos Orb"], "カオスオーブ");
  assert.equal(currencyNamesKo["Exalted Orb"], "엑잘티드 오브");
  assert.equal(currencyNamesKo["Divine Orb"], "신성한 오브");
  assert.equal(currencyNamesKo["Chaos Orb"], "카오스 오브");
});

test("dashboard default locale follows supported user languages", () => {
  assert.equal(getSupportedLocale("en-US"), "en");
  assert.equal(getSupportedLocale("zh-CN"), "zh-CN");
  assert.equal(getSupportedLocale("zh-TW"), "zh-TW");
  assert.equal(getSupportedLocale("zh-HK"), "zh-TW");
  assert.equal(getSupportedLocale("zh-MO"), "zh-TW");
  assert.equal(getSupportedLocale("zh-Hant-HK"), "zh-TW");
  assert.equal(getSupportedLocale("ja-JP"), "ja");
  assert.equal(getSupportedLocale("ko-KR"), "ko");
  assert.equal(getSupportedLocale("pt-BR"), "pt");
  assert.equal(getLocaleFromAcceptLanguage(""), "en");
  assert.equal(getLocaleFromAcceptLanguage("it-IT, en-US;q=0.9"), "en");
  assert.equal(getLocaleFromAcceptLanguage("fr-FR, en-US;q=0.9"), "fr");
  assert.equal(getLocaleFromAcceptLanguage("ja-JP, zh-TW;q=0.8"), "ja");
  assert.equal(getLocaleFromAcceptLanguage("ko-KR, en-US;q=0.8"), "ko");
});

test("app identity metadata is deploy-ready", () => {
  assert.equal(packageJson.name, "poe2-market-arbitrage-desk");
  assert.match(siteMetadata, /POE2 Market Arbitrage Desk/);
  assert.match(siteMetadata, /openGraph/);
  assert.match(siteMetadata, /twitter/);
  assert.match(siteMetadata, /og-image\.png/);
  assert.match(siteMetadata, /apple-icon\.png/);
  assert.match(siteMetadata, /favicon\.png/);
  assert.doesNotMatch(siteMetadata, /poe2scout/);
  assert.match(layout, /metadata = ROOT_METADATA/);
  assert.match(layout, /@vercel\/analytics\/next/);
  assert.match(layout, /@vercel\/speed-insights\/next/);
  assert.match(layout, /<Analytics \/>/);
  assert.match(layout, /<SpeedInsights \/>/);
  assert.match(siteMetadata, /NEXT_PUBLIC_SITE_URL/);
  assert.match(siteMetadata, /alternates\["x-default"\] = formatPath\(LOCALE_ROUTES\.en\)/);
  assert.match(siteMetadata, /SUPPORTED_LOCALES/);
  assert.match(siteMetadata, /getLocalizedPageMetadata/);
  assert.match(localeSource, /path: "\/cn"/);
  assert.match(localeSource, /path: "\/jp"/);
  assert.match(localeSource, /path: "\/kr"/);
  assert.match(localeSource, /hreflang: "zh-TW"/);
  assert.match(localeSource, /hreflang: "ja"/);
  assert.match(localeSource, /hreflang: "ko"/);
  assert.match(page, /redirect\(`\/\$\{getLocaleRoute\(initialLocale\)\}`\)/);
  assert.match(proxy, /export function proxy/);
  assert.match(proxy, /matcher: \["\/"\]/);
  assert.match(robots, /disallow: \["\/api\/"\]/);
  assert.match(sitemap, /changeFrequency: "hourly"/);
  assert.match(sitemap, /Object\.values\(LOCALE_ROUTES\)/);
  assert.match(sitemap, /\/trends/);
});
