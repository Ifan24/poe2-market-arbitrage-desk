# Agent Guidelines

These notes help automated coding agents and human contributors preserve the project shape while adding features.

## Project Shape

This repo is a POE2 market arbitrage dashboard deployed as a Next.js app on Vercel. The public production path is web-first: Vercel should serve the app shell, while market data can be served as static snapshots from a dedicated data plane. A desktop port is not an active goal; keep domain code reusable when it is cheap, but do not distort the web/Vercel architecture for desktop-only concerns.

## Working Rules

- Use conventional commit style when creating commits.
- Check `git status --short` before editing. Existing dirty files may belong to someone else; do not revert them unless explicitly asked.
- Prefer small, behavior-preserving refactors before feature work when touching large modules.
- Run `npm test` for logic or UI-surface changes.
- Run `npm run build` when changing Next.js routes, metadata, data loading, hosted deployment behavior, or runtime assumptions.
- While `public/market-baseline.json`, `public/poe-ninja-data.json`, `public/poe-ninja-data.js`, and `public/item-icons/` remain in the repo, treat them as generated-but-versioned assets. Do not mix generated snapshot edits with hand-written logic unless the task is explicitly a data refresh.
- Do not prune older checked-in item icons during normal refresh work; the local icon cache intentionally covers more than the current market snapshot. If the project moves icons to R2, stop committing generated icon churn rather than pruning unrelated existing assets in the same change.

## Architecture Guidelines

- Favor deep modules: small interface, substantial implementation, clear locality.
- Keep market arbitrage math out of React rendering. Currency conversion, target ranking, ROI filtering, gold efficiency, and integer lot planning belong in tested domain modules using fixture `MarketState` data.
- Keep dashboard derived state in `lib/dashboard-model.ts`. Do not rebuild result filtering, sorting, overview stats, or selection summaries inside React rendering.
- Keep market display policy in `components/market-display.tsx` and `lib/market-display-policy.ts`. Do not duplicate item-icon, category-label, currency-name, or locale fallback rules in dashboard views.
- Keep provider adapters thin. `poe2scout`, `poe.ninja`, and any future source should adapt provider responses into one normalized market snapshot shape.
- Keep shared provider network behavior in `lib/provider-fetch.mjs`. Data scripts should use the common retry, timeout, and image conversion helpers instead of hand-rolling fetch loops.
- Avoid adding new shallow modules that only pass through arguments. Use the deletion test: if deleting the module only moves complexity to callers, deepen or skip it.
- Do not duplicate refresh logic across Next routes, local scripts, and hosted deployment paths. Put refresh orchestration behind one module and let runtime-specific adapters call it.
- Keep localization and formatting cohesive. UI text, translated item names, tag labels, number/date formatting, and locale fallback should not be scattered through dashboard rendering.
- Keep user-facing website copy focused on the product experience and domain language. Do not expose implementation details such as R2, manifests, snapshots, providers, buckets, fallback files, data sources, or other plumbing in UI text unless the screen is explicitly an operator/debug surface.
- Treat Vercel/static snapshot behavior as the default app-shell path. Runtime writes to `public/` are local-development behavior, not durable hosted storage.

## Market Data Storage Direction

- Prefer Cloudflare R2 as the durable data plane for generated market artifacts: latest/manifest files, trend summaries, raw hourly snapshots, and item icons. Git should contain source code and small config, not hourly market history.
- Keep `public/market-baseline.json` as a daily static baseline for build-time fallback and crawlable context. It is not the live market source and should not have a JavaScript wrapper.
- Use an R2 custom domain for public reads, not the `r2.dev` development URL. Configure Cloudflare cache rules, WAF/rate limiting, and budget alerts on the custom domain.
- Keep the frontend payload small. The browser should fetch a manifest plus the current snapshot/trend summary and visible icons; it should not download many hourly raw snapshots.
- Prefer a tiny `manifest.json` that points to versioned artifacts over treating mutable `latest.json` as the source of truth. Upload versioned files first, validate them, then update the manifest last.
- Store raw snapshots by league and timestamp, for example `leagues/{leagueId}/snapshots/hourly/{iso}.json`. Keep compact daily or trend aggregates for long-term analysis instead of forcing all analytics to read raw hourly files.
- Do not add D1 or another query database for the first R2 migration unless the feature truly needs ad hoc server-side queries. Generated `market-trends.json` is enough for initial trend, volatility, liquidity, and opportunity-persistence analytics.
- For icons on R2, use stable keys and long immutable cache headers. Keep a local placeholder/fallback in the app.

## League And Economy Rules

- POE2 economies reset by league. Never mix trends or snapshots across leagues; old league data is legacy research data, not a current trading signal.
- Treat `leagueId` as part of every persisted market artifact and analytics result. Storage and manifests should be league-first even if the UI initially shows only the active league.
- Poe2 Scout exposes realm metadata via `GET /api/Realms` and league metadata via `GET /api/{realm}/Leagues`. For POE2, the realm id is `poe2`; do not accidentally use POE1 realms such as `pc`.
- Use league `ShortName` as the stable path key and `IsCurrent` to discover current league candidates. Keep the configured softcore league pin aligned with current Scout metadata instead of recording a time-sensitive league name in durable guidance.
- Multiple leagues can be current at once, including hardcore variants. Default to the configured softcore trade lane unless the user explicitly asks to support hardcore or multiple simultaneous economies.
- If Scout reports more than one valid current softcore candidate, fail loudly or keep the previously pinned active league instead of switching randomly.
- League rollover may be detected automatically from Poe2 Scout, but the pipeline must avoid polluting the previous league path. Prefer a pinned active league with an explicit auto-switch policy and a status artifact that reports detected switch candidates.

## Runtime And Hosting Rules

- Keep Node-only code (`node:*`, `process.cwd()`, `vm`, child process spawning) out of client modules.
- Keep browser-only code (`window`, `document`, `localStorage`, `navigator`) behind explicit adapter modules.
- In the legacy/static path, prefer `public/poe-ninja-data.json` for persisted market data and keep executable `window.POE_NINJA_DATA = ...` files only as browser compatibility artifacts. In the R2 data-plane path, fetch market data from the R2 manifest instead of `public/`; use `public/market-baseline.json` only for build-time bootstrap and fallback.
- Design refresh as a runtime seam: local Next.js can call an HTTP route, scheduled jobs can run scripts, hosted Vercel can serve static snapshots, and tests can use in-memory adapters.
- Use `path` utilities rather than string-built paths, and keep `windowsHide: true` when spawning from Node.
- Keep `next-env.d.ts` route-type churn out of routine commits unless the change is intentional and stable.

## Large File Policy

- `components/market-dashboard.tsx` is already large; avoid adding new responsibilities to it.
- When editing a large file, first identify whether the change belongs in a deeper module. Good extraction targets are arbitrage calculations, dashboard preferences, refresh orchestration, provider normalization, and locale formatting.
- Do not split files purely by line count. Split at real seams where locality and tests improve.

## Contributor Docs

- Domain-doc discovery guidance lives in `docs/agents/domain.md`.
- Completed roadmap context lives in `docs/roadmap/dashboard-roadmap.md`. Treat it as historical context, not an active backlog.
- Public follow-up ideas live in `docs/roadmap/next-steps.md`.
