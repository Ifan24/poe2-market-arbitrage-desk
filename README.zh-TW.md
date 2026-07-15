# POE2 Market Arbitrage Desk

[English](README.md) | [繁體中文](README.zh-TW.md)

[poe2marketdesk.com](https://poe2marketdesk.com)

[![POE2 Market Arbitrage Desk 繁體中文動態預覽](videos/poe2-market-desk-demo-zh-TW/renders/poe2-market-desk-demo-zh-TW.gif)](videos/poe2-market-desk-demo-zh-TW/renders/poe2-market-desk-demo-zh-TW.mp4)

POE2 Market Arbitrage Desk 是一個 Next.js 儀表板，用來比較 Path of Exile 2 的通貨交易路線，包含買入價、賣出價、ROI、庫存、整數批量交易計畫與金幣效率。

專案以 poe2scout 匯入的市場快照為核心，並補上 POE2DB 的通貨中繼資料。公開部署由 Vercel 提供 app shell，從公開資料主機讀取最新市場資料，並保留每日提交的靜態 baseline 作為建置與故障備援。

這是非官方玩家專案，與 Grinding Gear Games、Path of Exile、poe2scout、POE2DB 或 poe.ninja 無關。

## 功能

- 比較混沌石、崇高石、神聖石之間的交易路線。
- 依 ROI、成交量、庫存、金幣成本與標準化效率篩選。
- 針對接近整數的買入與賣出數量建立 round-lot 交易計畫。
- 收藏、搜尋、分頁與瀏覽器本機保存的儀表板偏好設定。
- 提供英文、繁體中文、簡體中文、日文、韓文、俄文、葡萄牙文、泰文、法文、德文與西班牙文等十一個在地化路由。
- Vercel app shell 搭配公開市場資料主機與每日 baseline 備援。
- 已測試的領域模組，涵蓋套利計算、儀表板衍生狀態、市場顯示規則、供應商抓取與快照儲存。

## 技術棧

- Next.js App Router
- React
- TypeScript
- Tailwind CSS v4
- shadcn/ui primitives
- Vercel Analytics 與 Speed Insights
- Node.js test runner

## 快速開始

```bash
npm install
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)。

## 常用指令

```bash
npm test
```

執行儀表板與領域邏輯的回歸測試。

```bash
npm run build
```

建置 Next.js app。

```bash
npm run update:poe2scout
```

抓取新的 poe2scout 快照、補上 POE2DB 資料，並寫入：

```text
public/poe-ninja-data.json
public/poe-ninja-data.js
```

```bash
npm run update:poe-ninja
```

執行較舊的 poe.ninja 備用匯入器，並寫入相同格式的快照。

```bash
npm run update:market-baseline
```

寫入建置與故障備援使用的每日靜態 baseline：

```text
public/market-baseline.json
```

```bash
npm run update:poe2db-icons
```

從 POE2DB 更新本機物品圖示快取。

## 資料與部署

產生的市場資料位於：

```text
public/poe-ninja-data.json
public/poe-ninja-data.js
```

JSON 檔是主要的本機持久化快照；JavaScript 檔只作為瀏覽器相容性產物。靜態 app bootstrap 使用：

```text
public/market-baseline.json
```

Baseline 最多每天提交一次，不是即時市場來源。它讓 app 在公開資料主機暫時不可用時，仍能提供有用的建置內容與備援資料。

在 Vercel 上，執行期間寫入 `public/` 並不是持久儲存。Runtime refresh 在所有環境都預設停用；只有受信任且可寫入的 runtime 同時設定 `MARKET_REFRESH_ALLOW_RUNTIME_WRITE=1` 與 `MARKET_REFRESH_TOKEN` 才能啟用。建議的公開部署流程是：

1. 由 dispatched workflow 每小時更新市場資料並上傳到公開資料主機。
2. 由每日 baseline workflow 更新並提交 `public/market-baseline.json`。
3. Vercel 只部署 app 程式碼與每日 baseline 變更。

此 repo 包含 `.github/workflows/refresh-market-data.yml`，被 dispatch 時會更新市場資料並上傳產生的 artifacts。每小時排程由 `cloudflare/market-refresh-dispatcher` 裡的 Cloudflare Worker 負責，會在第 17 分鐘呼叫 GitHub workflow dispatch API。

`.github/workflows/refresh-market-baseline.yml` 每天只更新並提交 `public/market-baseline.json`。

部署排程器：

```bash
cd cloudflare/market-refresh-dispatcher
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put DISPATCH_SECRET
npx wrangler deploy
```

`GITHUB_TOKEN` 需要有 dispatch `refresh-market-data.yml` workflow 的權限。`DISPATCH_SECRET` 只用於手動 `POST` 呼叫 Worker；Cloudflare cron trigger 本身不需要它。

## 貢獻者備註

Repository: [Ifan24/poe2-market-arbitrage-desk](https://github.com/Ifan24/poe2-market-arbitrage-desk).

貢獻者需要知道的架構與驗證原則放在 [AGENTS.md](AGENTS.md)。歷史決策放在 [docs/roadmap/dashboard-roadmap.md](docs/roadmap/dashboard-roadmap.md)，精簡的公開 backlog 放在 [docs/roadmap/next-steps.md](docs/roadmap/next-steps.md)。

README 的動態預覽使用 HyperFrames 製作。繁體中文來源檔案放在 [videos/poe2-market-desk-demo-zh-TW](videos/poe2-market-desk-demo-zh-TW)。

## 環境變數

App 不需要必填 secret。以下選用變數可調整行為：

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | metadata、sitemap、robots 與社群卡片使用的 canonical site URL。預設為 `https://poe2marketdesk.com`。 |
| `MARKET_REFRESH_ALLOW_RUNTIME_WRITE` | 只有在受信任且明確支援產生快照寫入的 runtime 才設為 `1`；所有環境預設停用 runtime refresh。 |
| `MARKET_REFRESH_TOKEN` | 明確啟用 runtime 寫入時，`POST /api/refresh` 必須使用的 server-only bearer token。 |
| `NEXT_PUBLIC_MARKET_DATA_BASE_URL` | 瀏覽器載入目前市場資料與產生物品圖示的公開 base URL。預設為 `https://data.poe2marketdesk.com`，所以本機開發也會預設使用公開 R2 data plane。 |
| `R2_ACCOUNT_ID` | GitHub Actions secret，用於上傳市場 artifacts 到公開 data bucket。 |
| `R2_ACCESS_KEY_ID` | GitHub Actions secret，用於上傳市場 artifacts 到公開 data bucket。 |
| `R2_SECRET_ACCESS_KEY` | GitHub Actions secret，用於上傳市場 artifacts 到公開 data bucket。 |
| `R2_BUCKET_NAME` | GitHub Actions secret，指定市場 artifact bucket 名稱。 |
| `R2_PUBLIC_BASE_URL` | 市場上傳 workflow summary 回報的公開 base URL。 |
| `GITHUB_TOKEN` | Cloudflare Worker secret，用來讓 market refresh dispatcher 呼叫 GitHub workflow dispatch API。 |
| `DISPATCH_SECRET` | 選用的 Cloudflare Worker secret，用於驗證手動 refresh dispatch。 |
| `POE2SCOUT_MIN_VALUE_TRADED_DIVINE` | poe2scout 匯入器的最小交易價值篩選。 |
| `POE2SCOUT_MIN_STOCK` | poe2scout 匯入器的最小庫存篩選。 |
| `POE2SCOUT_MIN_PRICE_EXALTED` | 匯入目標的最小崇高石價格。 |
| `POE2SCOUT_MAX_PRICE_EXALTED` | 匯入目標的最大崇高石價格。 |
| `POE2SCOUT_MIN_ROI_PERCENT` | 匯入目標的最小 ROI。 |
| `POE2SCOUT_MAX_ROI_PERCENT` | 匯入目標的最大 ROI。 |
| `POE_NINJA_MIN_VOLUME_PRIMARY_VALUE` | poe.ninja 備用匯入器的最小成交量篩選。 |

## 專案結構

```text
app/                         Next.js routes、metadata、sitemap、robots 與 API handlers
components/                  Dashboard UI 與 shadcn/ui primitives
lib/dashboard-model.ts       儀表板結果、統計、篩選與選取摘要的衍生狀態
lib/market-arbitrage.ts      套利計算與整數交易計畫
lib/market-display-policy.ts 多語系物品、分類與通貨顯示規則
lib/market-refresh.mjs       快照更新 orchestration
lib/provider-fetch.mjs       共用 provider fetch、retry、timeout 與圖片 helper
public/                      靜態資產、每日 baseline、產生快照與本機圖示快取
scripts/                     匯入器、圖示更新、本機 refresh server 與回歸測試
docs/                        公開專案文件
```

## 授權

MIT. See [LICENSE](LICENSE).
