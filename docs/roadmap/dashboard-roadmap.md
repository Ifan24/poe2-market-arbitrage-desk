# Dashboard Roadmap History

Status: completed

This note preserves the useful context from the first public-dashboard roadmap without keeping old scratch comments, local port notes, or agent-session details.

## Completed Slices

- App identity, favicon, deploy metadata, Open Graph, Twitter metadata, sitemap, and robots coverage.
- Route and filter defaults with currency/category icons.
- Focused round-lot planner modal for in-game trade quantities.
- Gold efficiency normalized as gold per Divine profit across routes.
- Best buy/sell currency comparison for a selected target.
- poe2scout refresh safeguards with cooldown and concurrent-refresh protection.
- Neutral planner copy for snapshot-derived paired values.
- Dashboard preferences adapter for browser storage, language, and document-locale access.
- English and Traditional Chinese routes at `/en` and `/cn`.
- Static Vercel snapshot deployment behavior with hosted runtime writes disabled by default.

## Durable Decisions

- Keep the dashboard web-first and Vercel-friendly.
- Historical implementation used generated snapshots in `public/poe-ninja-data.json` and `public/poe-ninja-data.js`; live production delivery now uses the public data host, while these files remain local compatibility artifacts.
- Historical implementation kept item icons checked in as a broad generated cache; production icon delivery now prefers the public data host while local fallbacks remain available.
- Keep arbitrage math and dashboard derived state in tested domain modules instead of React rendering.
- Prefer a scheduled/static snapshot path for production rather than runtime writes from Vercel functions.

## Future Ideas

- Historical route charts.
- Item trend alerts.
- Saved watchlists.
- Discord, Telegram, or browser notifications for watched routes.
- A paid or donation-supported tier only if server-side features justify the extra operational surface.
