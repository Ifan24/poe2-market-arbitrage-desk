import test from "node:test";
import assert from "node:assert/strict";
import {
  POE2SCOUT_REALM,
  getPoe2ScoutLeagueApiBase,
  isHardcoreLeague,
  selectActiveSoftcoreLeague
} from "../lib/poe2scout-leagues.mjs";

test("poe2scout league helpers use the POE2 realm", () => {
  assert.equal(POE2SCOUT_REALM, "poe2");
  assert.equal(getPoe2ScoutLeagueApiBase(), "https://poe2scout.com/api/poe2/Leagues");
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
