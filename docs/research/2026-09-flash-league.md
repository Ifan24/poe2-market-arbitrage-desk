# Path of Exile 2: September 2026 Flash League Lifecycle & Poe2Scout API Research

**Document ID:** `docs/research/2026-09-flash-league.md`  
**Date of Investigation:** 2026-09-14  
**Subject:** POE2 "Forbidden Rites" Event League (Patch 0.5.5), Concurrency with "Runes of Aldur", and Poe2Scout API Endpoints & Schemas  

---

## Executive Summary

On September 4, 2026, Grinding Gear Games (GGG) released **Patch 0.5.5** introducing the **Forbidden Rites** event league (commonly referenced as the Flash/Event league). In contrast to short one-month race events, GGG officially confirmed that Forbidden Rites will run until the full release of Path of Exile 2 1.0 on **December 11, 2026**, operating **concurrently** with the existing **Runes of Aldur** league. Both leagues maintain completely independent economies and challenge tracks.

Simultaneously, live first-party probes confirm that Poe2Scout has migrated its REST API endpoints from the path `poe2scout.com/api/{realm}/...` to the dedicated API host `api.poe2scout.com/{realm}/...`. The old path now serves the React Router / SPA web frontend HTML, causing JSON parse failures in unadapted data scrapers. Furthermore, Poe2Scout currently marks **both** `forbiddenrites` and `runes` as `IsCurrent: true`. To prevent economy mixing and scraper failure, refresh pipelines must pin the active league or handle multi-league artifact partitioning under strict league-isolated R2 paths.

---

## 1. Official League Lifecycle & Mechanics (First-Party GGG Sources)

### 1.1 Key Official Facts
- **League Title:** Path of Exile 2: Forbidden Rites
- **Release Patch:** Patch 0.5.5
- **Official Launch Date & Time:** September 4, 2026 at 1:00 PM PDT (2026-09-04 20:00 UTC; September 5, 2026 6:00 AM NZST/GMT+10)
- **Official End Date:** December 11, 2026 (coinciding with the full Path of Exile 2 1.0 release)
- **Event Nature:** GGG explicitly addressed community inquiries regarding event duration:
  > *"Is this a one-month-long event? No. Forbidden Rites will run until the 1.0 full release and will end alongside Runes of Aldur."*
- **Concurrent Runes of Aldur Status:** The Runes of Aldur league was **not** terminated or voided. It remains fully active and playable alongside Forbidden Rites until December 11, 2026. Players may continue completing Runes of Aldur challenges.
- **Game Mechanics Integration:**
  - Patch 0.5.5 migrated Runes of Aldur mechanics (Farrow, Dannig, Kalguuran Expeditions, Expedition Logbooks, and the Verisium Anvil) into the core game for Standard and Forbidden Rites.
  - Forbidden Rites features dedicated event mechanics: campaign and boss-chained Rituals, Sacred Blooms, and Viridian Wildwood / Azmeri Wisps empowering map encounters.
- **League Variations & Hardcore Parenting:**
  - Variations: Standard (Softcore), Hardcore (HC), Solo Self-Found (SSF), and Private League variations.
  - Parenting Rule: Hardcore Forbidden Rites characters migrate upon death to **Standard Forbidden Rites** (not to Standard Core or Runes of Aldur).

### 1.2 First-Party Sources Cited
- **GGG Forbidden Rites FAQ:** [https://www.pathofexile.com/forum/view-thread/4000430](https://www.pathofexile.com/forum/view-thread/4000430) (Published Aug 31, 2026 by Natalia_GGG)
- **GGG Patch 0.5.5 Notes:** [https://www.pathofexile.com/forum/view-thread/4000864](https://www.pathofexile.com/forum/view-thread/4000864) (Published Sep 3, 2026 by Stacey_GGG)
- **GGG Official Announcement Video:** [https://youtu.be/WMo3RYyr4vY?t=1169](https://youtu.be/WMo3RYyr4vY?t=1169)

---

## 2. Poe2Scout API Behavior & Response Schemas

### 2.1 API Host & Endpoint Migration
- **Historical Endpoint in Repo:** `https://poe2scout.com/api/{realm}/Leagues`
  - **Current Behavior:** Returns HTTP 200 with HTML (`<!DOCTYPE html>...`), the Cloudflare Pages/Vite SPA bundle for the user-facing website. Requesting JSON from this host results in a JSON parse error (`SyntaxError: Unexpected token '<'`).
- **Active First-Party API Host:** `https://api.poe2scout.com`
  - OpenAPI Specification: `https://api.poe2scout.com/openapi/v1.json` (OpenAPI 3.1.1)
  - Swagger UI: `https://api.poe2scout.com/swagger`
- **Endpoint Structure:**
  - Note: Paths on `api.poe2scout.com` do **not** use an `/api` prefix.
  - Realms: `GET https://api.poe2scout.com/Realms`
  - League List: `GET https://api.poe2scout.com/{realm}/Leagues` (e.g. `GET https://api.poe2scout.com/poe2/Leagues`)
  - Exchange Snapshot: `GET https://api.poe2scout.com/{realm}/Leagues/{leagueName}/ExchangeSnapshot`
  - Snapshot Pairs: `GET https://api.poe2scout.com/{realm}/Leagues/{leagueName}/SnapshotPairs`

### 2.2 Live League Entities (Observed 2026-09-14)
Querying `GET https://api.poe2scout.com/poe2/Leagues` returns 12 total league entities. Four are flagged as active (`IsCurrent: true`):

| Value | ShortName | IsCurrent | Hardcore | DivinePrice (Exalted) | ChaosDivinePrice (Chaos/Div) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Forbidden Rites** | `forbiddenrites` | `true` | No | ~382.92 | ~9.13 |
| **HC Forbidden Rites** | `forbiddenriteshc` | `true` | Yes | ~166.02 | ~12.00 |
| **Runes of Aldur** | `runes` | `true` | No | ~486.25 | ~11.14 |
| **HC Runes of Aldur** | `runeshc` | `true` | Yes | ~220.00 | ~10.00 |

*Inactive leagues returned with `IsCurrent: false` include:*
- `hunt` / `hunthc` (Dawn of the Hunt)
- `abyssal` / `abyssalhc` (Rise of the Abyssal)
- `standard` / `hardcore` (Core Standard / Hardcore)
- `vaal` / `vaalhc` (Fate of the Vaal)

### 2.3 Hardcore League Distinction
Poe2Scout identifies Hardcore leagues through naming conventions:
- `ShortName` ends with `hc` (e.g. `forbiddenriteshc`, `runeshc`, `hunthc`, `vaalhc`).
- `Value` starts with `HC ` or equals `Hardcore`.
The repo's existing predicate in `lib/poe2scout-leagues.mjs`:
```js
export function isHardcoreLeague(league) {
  const shortName = String(league?.ShortName || "").toLowerCase();
  const value = String(league?.Value || "").toLowerCase();
  return shortName.endsWith("hc") || value.startsWith("hc ") || value.startsWith("hardcore ");
}
```
accurately and completely filters both `forbiddenriteshc` and `runeshc`.

### 2.4 Exact Data Schemas (OpenAPI 3.1.1 Contract)

#### A. League List Item (`Leagues.GetResponse`)
```json
{
  "Value": "Forbidden Rites",
  "ShortName": "forbiddenrites",
  "IsCurrent": true,
  "DivinePrice": 382.915,
  "ChaosDivinePrice": 9.128,
  "BaseCurrencyApiId": "exalted",
  "BaseCurrencyBaseItemTypeId": "Metadata/Items/Currency/CurrencyAddModToRare",
  "BaseCurrencyText": "Exalted Orb",
  "BaseCurrencyIconUrl": "https://web.poecdn.com/...",
  "ExaltedCurrencyText": "Exalted Orb",
  "ExaltedCurrencyIconUrl": "https://web.poecdn.com/...",
  "DivineCurrencyText": "Divine Orb",
  "DivineCurrencyIconUrl": "https://web.poecdn.com/...",
  "ChaosCurrencyText": "Chaos Orb",
  "ChaosCurrencyIconUrl": "https://web.poecdn.com/...",
  "DefaultCurrency": {
    "ApiId": "exalted",
    "BaseItemTypeId": "Metadata/Items/Currency/CurrencyAddModToRare",
    "Text": "Exalted Orb",
    "IconUrl": "https://web.poecdn.com/...",
    "RelativePrice": 1.0
  }
}
```

#### B. Exchange Snapshot (`Leagues.GetExchangeSnapshotResponse`)
Endpoint: `GET /poe2/Leagues/{leagueName}/ExchangeSnapshot`
```json
{
  "Epoch": 1789372800,
  "Volume": 322678950.82,
  "MarketCap": 542517020.68,
  "BaseCurrencyApiId": "exalted",
  "BaseCurrencyBaseItemTypeId": "Metadata/Items/Currency/CurrencyAddModToRare",
  "BaseCurrencyText": "Exalted Orb"
}
```
*(Live 2026-09-14 24-hour volume in Forbidden Rites is 322.7M Exalted, compared to 14.7M Exalted in Runes of Aldur).*

#### C. Snapshot Pairs Item (`Leagues.GetSnapshotPairsResponse`)
Endpoint: `GET /poe2/Leagues/{leagueName}/SnapshotPairs`
```json
{
  "CurrencyExchangeSnapshotPairId": 123456,
  "CurrencyExchangeSnapshotId": 78910,
  "Volume": 254000.0,
  "BaseCurrencyApiId": "exalted",
  "BaseCurrencyBaseItemTypeId": "Metadata/Items/Currency/CurrencyAddModToRare",
  "BaseCurrencyText": "Exalted Orb",
  "CurrencyOne": {
    "ItemId": 12,
    "ApiId": "divine",
    "CategoryApiId": "currency",
    "Text": "Divine Orb",
    "IconUrl": "https://web.poecdn.com/..."
  },
  "CurrencyTwo": {
    "ItemId": 1,
    "ApiId": "exalted",
    "CategoryApiId": "currency",
    "Text": "Exalted Orb",
    "IconUrl": "https://web.poecdn.com/..."
  },
  "CurrencyOneData": {
    "VolumeTraded": 663.0,
    "ValueTraded": 253872.0,
    "HighestStock": 450
  },
  "CurrencyTwoData": {
    "VolumeTraded": 253872.0,
    "ValueTraded": 663.0,
    "HighestStock": 120000
  }
}
```

---

## 3. Explicit Distinction: Official Facts vs. Inferences

| Topic | Official Fact (Grounded in Source) | Operational Inference |
| :--- | :--- | :--- |
| **League Concurrency** | GGG explicitly stated Forbidden Rites and Runes of Aldur run concurrently until Dec 11, 2026. | Players have overwhelmingly migrated to Forbidden Rites (22x volume difference), but Runes of Aldur remains non-voided. |
| **Poe2Scout API State** | Poe2Scout returns `IsCurrent: true` for both `forbiddenrites` and `runes`. | Any unpinned future selector would be ambiguous; the observed CI failure occurs earlier because the stale API URL returns HTML. |
| **Endpoint Migration** | `api.poe2scout.com` hosts the OpenAPI 3.1.1 REST routes without `/api`; `poe2scout.com/api/...` returns HTML. | The web client was decoupled into a Cloudflare Pages/Vite SPA, moving API traffic to the dedicated subdomain. |
| **Currency Valuations** | Divine/Exalted ratio is ~382.9 in Forbidden Rites vs ~486.3 in Runes of Aldur. | Mixing timeseries data across both leagues would introduce artificial spread spikes and falsified arbitrage opportunities. |

---

## 4. Recommended Safe Multi-League Policy

To honor the domain constraint (*"Never mix trends or snapshots across leagues; old league data is legacy research data, not a current trading signal"*), the application must adhere to the following architecture:

### 4.1 Strict League Partitioning in Storage
1. **League-First Storage Keys:**
   All R2 and local snapshot storage must be keyed by `ShortName`:
   - `leagues/{leagueId}/snapshots/hourly/{epoch}.json`
   - `leagues/{leagueId}/trend-index.json`
   - `leagues/{leagueId}/manifest.json`
2. **Zero Cross-League Merging:**
   Trend aggregation scripts must never append hourly snapshots from `forbiddenrites` into a `runes` timeseries or vice versa. Once a league is no longer current, its history freezes as immutable historical data.

### 4.2 Deterministic League Resolution & CI Configuration
1. **Explicit Pinning via Environment Variable:**
   Do not rely on implicit resolution when `candidates.length > 1`. In GitHub Actions workflows and local scripts, provide:
   ```bash
   POE2SCOUT_ACTIVE_LEAGUE_SHORT_NAME="forbiddenrites"
   ```
2. **Active League Configuration:**
   Because Forbidden Rites holds >95% of current trade activity, default active tracking should pin to `forbiddenrites` while preserving the ability to target `runes` by parameterizing the refresh workflow:
   ```yaml
   env:
     POE2SCOUT_ACTIVE_LEAGUE_SHORT_NAME: ${{ vars.POE2SCOUT_ACTIVE_LEAGUE_SHORT_NAME || 'forbiddenrites' }}
   ```
3. **Provider Base URL Update:**
   Update provider fetch base to `https://api.poe2scout.com/{realm}/Leagues`, eliminating HTML 404/200 SPA collisions.

---

## 5. Summary Table for Implementation Agents

| Parameter | Recommended Value |
| :--- | :--- |
| **Active Target League** | `Forbidden Rites` |
| **Target ShortName** | `forbiddenrites` |
| **API Base URL** | `https://api.poe2scout.com/poe2/Leagues` |
| **Concurrent League** | `runes` (`Runes of Aldur`, active until 2026-12-11) |
| **Storage Separation** | Separate R2 prefixes (`leagues/forbiddenrites/` vs `leagues/runes/`) |
| **Cross-League Trends** | Strictly forbidden |
