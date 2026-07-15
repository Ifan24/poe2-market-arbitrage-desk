# POE2 Market Arbitrage Desk

[English](README.md) | [繁體中文](README.zh-TW.md)

[poe2marketdesk.com](https://poe2marketdesk.com)

[![POE2 Market Arbitrage Desk motion preview](videos/poe2-market-desk-demo/renders/poe2-market-desk-demo.gif)](videos/poe2-market-desk-demo/renders/poe2-market-desk-demo.mp4)

POE2 Market Arbitrage Desk is a Next.js dashboard for comparing Path of Exile 2 currency routes across buy price, sell price, ROI, stock, round-lot trade plans, and gold efficiency.

It is built around market snapshots imported from poe2scout and enriched with POE2DB currency metadata. The public deployment serves the app shell from Vercel, reads fresh market data from a public data host, and keeps a daily checked-in baseline for static fallback.

This is an unofficial fan project and is not affiliated with Grinding Gear Games, Path of Exile, poe2scout, POE2DB, or poe.ninja.

## Features

- Route comparison across Chaos, Exalted, and Divine pricing.
- ROI, volume, stock, gold-cost, and normalized efficiency filters.
- Round-lot trade planner for nearby integer buy/sell quantities.
- Favorites, search, pagination, and browser-persisted dashboard preferences.
- Eleven localized routes covering English, Traditional and Simplified Chinese, Japanese, Korean, Russian, Portuguese, Thai, French, German, and Spanish.
- Static Vercel app shell with hosted market data refresh and a daily baseline fallback.
- Tested domain modules for arbitrage math, dashboard derived state, market display policy, provider fetching, and snapshot storage.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS v4
- shadcn/ui primitives
- Vercel Analytics and Speed Insights
- Node.js test runner

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On macOS, you can also run:

```bash
./start-mac.sh
```

## Common Commands

```bash
npm test
```

Runs the dashboard and domain regression tests.

```bash
npm run build
```

Builds the Next.js app.

```bash
npm run update:poe2scout
```

Fetches a fresh poe2scout snapshot, enriches it with POE2DB data, and writes:

```text
public/poe-ninja-data.json
public/poe-ninja-data.js
```

```bash
npm run update:market-baseline
```

Writes the daily static baseline used for build-time fallback:

```text
public/market-baseline.json
```

```bash
npm run update:poe-ninja
```

Runs the older poe.ninja fallback importer and writes the same generated snapshot formats.

```bash
npm run update:poe2db-icons
```

Refreshes the local item icon cache from POE2DB.

## Data And Deployment

Generated local market snapshots live in:

```text
public/poe-ninja-data.json
public/poe-ninja-data.js
```

The JSON file is the preferred persisted snapshot. The JavaScript file exists as a browser compatibility artifact.

The static app bootstrap uses:

```text
public/market-baseline.json
```

This baseline is committed at most once per day. It is not the live market source; it exists so the app has useful build-time and fallback data without bringing back hourly generated-data commits.

On Vercel, runtime writes to `public/` are not durable. Runtime refresh is disabled by default everywhere and requires both `MARKET_REFRESH_ALLOW_RUNTIME_WRITE=1` and a valid `MARKET_REFRESH_TOKEN` on an explicitly writable trusted runtime. The recommended public path is:

1. Refresh hourly market data through the dispatched workflow and upload it to the public data host.
2. Refresh and commit `public/market-baseline.json` with the daily baseline workflow.
3. Let Vercel deploy app code and daily baseline changes only.

This repo includes `.github/workflows/refresh-market-data.yml`, which refreshes the market data when dispatched and uploads generated artifacts to the public data host. Hourly scheduling is handled by the Cloudflare Worker in `cloudflare/market-refresh-dispatcher`, which calls GitHub's workflow dispatch API at minute 17.

This repo also includes `.github/workflows/refresh-market-baseline.yml`, which refreshes and commits only `public/market-baseline.json` once per day.

### Trend Index Retention

The refresh path keeps a league-scoped history index for the active economy. The index stores recent hourly snapshot keys only, not duplicate full market payloads. Trend generation reads the bounded seven-day history needed for the supported 24h and 7d persistence windows.

When a league ends, its historical objects become legacy research data. They should not be mixed into the next league's current trading signals. A new league should write to a new league path, and old league data can remain archived for later study.

Profit Persistence is a confidence signal, not a promise of future profit. Future Flip Candidate work should be treated as manual investigation leads only, not as confirmed executable trades.

To deploy the scheduler:

```bash
cd cloudflare/market-refresh-dispatcher
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put DISPATCH_SECRET
npx wrangler deploy
```

`GITHUB_TOKEN` needs permission to dispatch the `refresh-market-data.yml` workflow. `DISPATCH_SECRET` is only used for manual `POST` dispatches to the Worker; the Cloudflare cron trigger does not need it.

## Contributor Notes

Repository: [Ifan24/poe2-market-arbitrage-desk](https://github.com/Ifan24/poe2-market-arbitrage-desk).

Contributor architecture and verification guidance is kept in [AGENTS.md](AGENTS.md). Historical decisions live in [docs/roadmap/dashboard-roadmap.md](docs/roadmap/dashboard-roadmap.md), and the concise public backlog lives in [docs/roadmap/next-steps.md](docs/roadmap/next-steps.md).

The README motion preview is built with HyperFrames. Source files live in [videos/poe2-market-desk-demo](videos/poe2-market-desk-demo).

## Environment Variables

The app runs without required secrets. These optional variables tune behavior:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL used for metadata, sitemap, robots, and social cards. Defaults to `https://poe2marketdesk.com`. |
| `MARKET_REFRESH_ALLOW_RUNTIME_WRITE` | Set to `1` only in trusted runtimes where generated snapshot writes are intentionally supported. Runtime refresh is disabled by default everywhere. |
| `MARKET_REFRESH_TOKEN` | Server-only bearer token required by `POST /api/refresh` when runtime writes are explicitly enabled. |
| `NEXT_PUBLIC_MARKET_DATA_BASE_URL` | Public base URL used by the browser to load current market data and generated item icons. Defaults to `https://data.poe2marketdesk.com`, so local development uses the public R2 data plane by default. |
| `R2_ACCOUNT_ID` | GitHub Actions secret used to upload market artifacts to the public data bucket. |
| `R2_ACCESS_KEY_ID` | GitHub Actions secret used to upload market artifacts to the public data bucket. |
| `R2_SECRET_ACCESS_KEY` | GitHub Actions secret used to upload market artifacts to the public data bucket. |
| `R2_BUCKET_NAME` | GitHub Actions secret naming the market artifact bucket. |
| `R2_PUBLIC_BASE_URL` | Public base URL reported in the market upload workflow summary. |
| `GITHUB_TOKEN` | Cloudflare Worker secret used by the market refresh dispatcher to call GitHub's workflow dispatch API. |
| `DISPATCH_SECRET` | Optional Cloudflare Worker secret for authenticated manual refresh dispatches. |
| `POE2SCOUT_MIN_VALUE_TRADED_DIVINE` | Minimum traded value filter for the poe2scout importer. |
| `POE2SCOUT_MIN_STOCK` | Minimum stock filter for the poe2scout importer. |
| `POE2SCOUT_MIN_PRICE_EXALTED` | Minimum Exalted price filter for imported targets. |
| `POE2SCOUT_MAX_PRICE_EXALTED` | Maximum Exalted price filter for imported targets. |
| `POE2SCOUT_MIN_ROI_PERCENT` | Minimum ROI filter for imported targets. |
| `POE2SCOUT_MAX_ROI_PERCENT` | Maximum ROI filter for imported targets. |
| `POE_NINJA_MIN_VOLUME_PRIMARY_VALUE` | Minimum volume filter for the poe.ninja fallback importer. |

## Project Structure

```text
app/                         Next.js routes, metadata, sitemap, robots, and API handlers
components/                  Dashboard UI and shadcn/ui primitives
lib/dashboard-model.ts       Derived dashboard results, stats, filtering, and selection summaries
lib/market-arbitrage.ts      Arbitrage math and integer trade planning
lib/market-display-policy.ts Locale-aware item/category/currency display rules
lib/market-refresh.mjs       Snapshot refresh orchestration
lib/provider-fetch.mjs       Shared provider fetch, retry, timeout, and image helpers
public/                      Static assets, daily baseline, generated snapshots, and local icon cache
scripts/                     Importers, icon refresh, local refresh server, and regression tests
docs/                        Public project notes
```

## License

MIT. See [LICENSE](LICENSE).
