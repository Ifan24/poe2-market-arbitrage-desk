import test from "node:test";
import assert from "node:assert/strict";
import {
  POE2SCOUT_REALM,
  getPoe2ScoutLeagueApiBase,
  getCurrentSoftcoreLeagues,
  getConfiguredActiveLeagueShortNames,
  isHardcoreLeague,
  selectActiveSoftcoreLeague
} from "../lib/poe2scout-leagues.mjs";

test("poe2scout league helpers use the POE2 realm", () => {
  assert.equal(POE2SCOUT_REALM, "poe2");
  assert.equal(getPoe2ScoutLeagueApiBase(), "https://api.poe2scout.com/poe2/Leagues");
});

test("poe2scout league selection keeps the pinned softcore lane", () => {
  const leagues = [
    { Value: "Runes of Aldur", ShortName: "runes", IsCurrent: true },
    { Value: "HC Runes of Aldur", ShortName: "runeshc", IsCurrent: true }
  ];

  assert.equal(selectActiveSoftcoreLeague(leagues, { pinnedShortName: "runes" }).Value, "Runes of Aldur");
  assert.equal(isHardcoreLeague(leagues[1]), true);
});

test("poe2scout league selection fails instead of randomly switching", () => {
  const leagues = [
    { Value: "Runes of Aldur", ShortName: "runes", IsCurrent: true },
    { Value: "Future League", ShortName: "future", IsCurrent: true }
  ];

  assert.throws(
    () => selectActiveSoftcoreLeague(leagues, { pinnedShortName: "missing" }),
    /pinned poe2scout league missing/
  );
  assert.throws(
    () => selectActiveSoftcoreLeague(leagues, { pinnedShortName: "" }),
    /multiple current POE2 softcore leagues/
  );
});

test("current softcore discovery excludes archived leagues and all hardcore names", () => {
  const current = [
    { Value: "Forbidden Rites", ShortName: "forbiddenrites", IsCurrent: true },
    { Value: "Runes of Aldur", ShortName: "runes", IsCurrent: true }
  ];
  assert.deepEqual(getCurrentSoftcoreLeagues([
    ...current,
    { Value: "Dawn of the Hunt", ShortName: "dawn", IsCurrent: false },
    { Value: "HC Runes of Aldur", ShortName: "runeshc", IsCurrent: true },
    { Value: "Hardcore Forbidden Rites", ShortName: "hardcore", IsCurrent: true },
    null
  ]), current);
});

test("league selection defaults to Forbidden Rites and honors configured lanes", () => {
  const leagues = [
    { Value: "Runes of Aldur", ShortName: "runes", IsCurrent: true },
    { Value: "Forbidden Rites", ShortName: "forbiddenrites", IsCurrent: true }
  ];
  assert.equal(selectActiveSoftcoreLeague(leagues, { env: {} }).ShortName, "forbiddenrites");
  assert.equal(selectActiveSoftcoreLeague(leagues, {
    env: { POE2SCOUT_DEFAULT_LEAGUE_SHORT_NAME: "runes" }
  }).ShortName, "runes");
  assert.equal(selectActiveSoftcoreLeague(leagues, {
    env: {
      POE2SCOUT_DEFAULT_LEAGUE_SHORT_NAME: "forbiddenrites",
      POE2SCOUT_ACTIVE_LEAGUE_SHORT_NAME: "runes"
    }
  }).ShortName, "runes");
  assert.throws(() => selectActiveSoftcoreLeague(leagues.slice(0, 1), { env: {} }),
    /pinned poe2scout league forbiddenrites/);
});

test("configured league names normalize without changing provider records", () => {
  const league = { Value: "Runes of Aldur", ShortName: "runes", IsCurrent: true };
  assert.equal(selectActiveSoftcoreLeague([league], {
    env: { POE2SCOUT_ACTIVE_LEAGUE_SHORT_NAME: " RUnes " }
  }), league);
  assert.equal(selectActiveSoftcoreLeague([league], {
    env: { POE2SCOUT_DEFAULT_LEAGUE_SHORT_NAME: " RUNES " }
  }), league);
  assert.deepEqual(getConfiguredActiveLeagueShortNames({
    POE2SCOUT_ACTIVE_LEAGUES_JSON: '[" ForbiddenRites ", "RUNES", "runes"]'
  }), ["forbiddenrites", "runes"]);
});

test("configured publication requires a nonempty array of safe league names", () => {
  for (const value of ["", "null", "{}", "[]", '[""]', '["  "]', '["../runes"]', "[1]", "invalid json"]) {
    assert.throws(() => getConfiguredActiveLeagueShortNames({
      POE2SCOUT_ACTIVE_LEAGUES_JSON: value
    }), /non-empty array of safe league short names/);
  }
  assert.equal(getConfiguredActiveLeagueShortNames({}), undefined);
});
