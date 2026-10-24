---
name: league-rollover
description: Before a new POE2 league starts (or when the refresh fails on an old league), check Poe2 Scout leagues, update the GitHub variables that pick which leagues the market refresh publishes, then trigger and verify a refresh.
---

# League rollover

The `Refresh market data` workflow (`.github/workflows/refresh-market-data.yml`) publishes every league in repo variable `POE2SCOUT_ACTIVE_LEAGUES_JSON` and makes `POE2SCOUT_DEFAULT_LEAGUE_SHORT_NAME` the site default (it is published last). If a variable is unset, the workflow's hardcoded fallback applies. Follow the league rules in `AGENTS.md`: realm `poe2` only, `ShortName` is the key, softcore only, never mix leagues.

## 1. Current state

```bash
gh variable list
grep -n "POE2SCOUT_" .github/workflows/refresh-market-data.yml
gh run list --workflow refresh-market-data.yml -L 5
curl -s https://data.poe2marketdesk.com/manifest.json | jq '{defaultLeagueId, availableLeagues: [.availableLeagues[].id], generatedAt}'
```

Effective value = repo variable if set, else the workflow fallback.

## 2. What Scout has now

```bash
curl -s https://api.poe2scout.com/poe2/Leagues | jq -c '.[] | {ShortName, Value, IsCurrent}'
```

Candidates are `IsCurrent: true` and not hardcore (hardcore = `ShortName` ends in `hc`, or `Value` starts with `HC `/`Hardcore `, see `isHardcoreLeague` in `lib/poe2scout-leagues.mjs`).

For each candidate, and for each league currently configured, check it has exchange data (the refresh reads these two endpoints):

```bash
for l in <shortnames>; do
  echo "$l pairs=$(curl -s https://api.poe2scout.com/poe2/Leagues/$l/SnapshotPairs | jq length) epoch=$(curl -s https://api.poe2scout.com/poe2/Leagues/$l/ExchangeSnapshot | jq .Epoch)"
done
```

A league with `IsCurrent: false`, 0 pairs, or an error response will fail the refresh (`selectActiveSoftcoreLeague` throws), so drop it. A brand-new league may show `IsCurrent: true` but few or no pairs before launch day; if it has none yet, leave it out and rerun this skill after launch.

## 3. Propose, then wait

Show the owner a short table: league, `IsCurrent`, pairs, current (in config?) vs proposed. Then propose:

- `POE2SCOUT_ACTIVE_LEAGUES_JSON`: compact JSON array of the kept softcore short names, e.g. `["newleague","runes"]`.
- `POE2SCOUT_DEFAULT_LEAGUE_SHORT_NAME`: usually the newest challenge league once it has data. It must be in the array.

Do not set anything until the owner confirms. If nothing changes, say so and stop.

## 4. Apply

```bash
gh variable set POE2SCOUT_ACTIVE_LEAGUES_JSON --body '["newleague","runes"]'
gh variable set POE2SCOUT_DEFAULT_LEAGUE_SHORT_NAME --body 'newleague'
gh variable list
```

Repo variables override the workflow fallback, so no code change is needed. Optionally offer to update the fallback in the workflow too (a commit, owner reviews it), so the repo matches the variables.

## 5. Refresh and verify

```bash
gh workflow run refresh-market-data.yml
sleep 5; gh run list --workflow refresh-market-data.yml -L 1
gh run watch <run-id> --exit-status
gh run view <run-id> --log | grep -E "Refresh and publish|failed|Error" 
```

Expect one `Refresh and publish <league>` group per league, the default last, and no errors. On failure, read `gh run view <run-id> --log-failed`; a "not a current softcore league" error means a league in the variable should be dropped.

Then confirm the live manifest (cache may lag a minute):

```bash
curl -s https://data.poe2marketdesk.com/manifest.json | jq '{defaultLeagueId, availableLeagues: [.availableLeagues[].id], activeLeague, generatedAt}'
```

`defaultLeagueId` should be the new default and `generatedAt` should be from this run. Note `availableLeagues` comes from Scout's current softcore list (`lib/r2-market-artifacts.mjs`), not from the variable, so a current league you left out still appears there; spot-check `https://data.poe2marketdesk.com/leagues/<league>/manifest.json` for each configured league instead. Report what changed and the run URL. Open the site once if the owner wants a visual check.
