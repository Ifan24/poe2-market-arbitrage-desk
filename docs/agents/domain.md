# Domain Docs

Start with the root `CONTEXT.md` glossary, then read the README, `AGENTS.md`, this file, and the code in `lib/` when learning the domain. The repo does not currently maintain a formal ADR set.

## Current Vocabulary

- **Market snapshot**: The normalized, versioned data shape consumed by the dashboard. The preferred local generated file is `public/poe-ninja-data.json`; `public/poe-ninja-data.js` is a compatibility artifact.
- **Market baseline**: The daily checked-in JSON at `public/market-baseline.json` used for build-time bootstrap and fallback. It is deliberately not the live market source.
- **Route**: A buy-currency to sell-currency path, such as Exalted Orb to Divine Orb.
- **Target**: The item being bought and sold through a route.
- **Gold efficiency**: Gold cost normalized against Divine profit so routes can be compared consistently.
- **Round-lot plan**: Integer trade quantities that help map market prices to in-game exchange inputs.
- **Provider adapter**: Thin code that converts a provider response, such as poe2scout or poe.ninja, into the shared market snapshot shape.

## Before Changing Domain Behavior

- Read `lib/market-arbitrage.ts` for route math and trade planning.
- Read `lib/dashboard-model.ts` for dashboard-derived result sets, filters, stats, and summaries.
- Read `lib/market-display-policy.ts` and `components/market-display.tsx` before changing item names, category labels, icons, or locale fallback behavior.
- Read `lib/market-refresh.mjs`, `lib/hosted-refresh-policy.ts`, and `AGENTS.md` before changing refresh behavior.

## ADRs

If a decision becomes durable and non-obvious, add a short ADR under `docs/adr/`. Keep it practical: context, decision, consequences, and links to the affected modules.
