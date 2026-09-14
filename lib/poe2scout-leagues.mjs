const DEFAULT_REALM = "poe2";
const DEFAULT_PINNED_LEAGUE = "forbiddenrites";

export function isHardcoreLeague(league) {
  const shortName = String(league?.ShortName || "").toLowerCase();
  const value = String(league?.Value || "").toLowerCase();
  return shortName.endsWith("hc") || value.startsWith("hc ") || value.startsWith("hardcore ");
}

export function getCurrentSoftcoreLeagues(leagues) {
  return leagues.filter((league) => league?.IsCurrent && !isHardcoreLeague(league));
}

export function getConfiguredActiveLeagueShortNames(env = process.env) {
  if (env.POE2SCOUT_ACTIVE_LEAGUES_JSON === undefined) return undefined;
  const message = "POE2SCOUT_ACTIVE_LEAGUES_JSON must be a non-empty array of safe league short names";
  let names;
  try {
    names = JSON.parse(env.POE2SCOUT_ACTIVE_LEAGUES_JSON);
  } catch {
    throw new Error(message);
  }
  if (!Array.isArray(names) || names.length === 0 ||
      names.some((name) => typeof name !== "string" || !/^[a-z0-9][a-z0-9_-]*$/i.test(name.trim()))) {
    throw new Error(message);
  }
  return [...new Set(names.map((name) => name.trim().toLowerCase()))];
}

export function selectActiveSoftcoreLeague(
  leagues,
  {
    env = process.env,
    pinnedShortName = env.POE2SCOUT_ACTIVE_LEAGUE_SHORT_NAME || env.POE2SCOUT_DEFAULT_LEAGUE_SHORT_NAME || DEFAULT_PINNED_LEAGUE
  } = {}
) {
  const candidates = getCurrentSoftcoreLeagues(leagues);
  if (!candidates.length) {
    throw new Error("poe2scout has no current POE2 softcore league");
  }

  if (pinnedShortName) {
    pinnedShortName = pinnedShortName.trim().toLowerCase();
    const pinned = candidates.find((league) => league.ShortName === pinnedShortName);
    if (!pinned) {
      const names = candidates.map((league) => league.ShortName).join(", ");
      throw new Error(
        `pinned poe2scout league ${pinnedShortName} is not a current softcore league; candidates: ${names}`
      );
    }
    return pinned;
  }

  if (candidates.length !== 1) {
    const names = candidates.map((league) => league.ShortName).join(", ");
    throw new Error(`multiple current POE2 softcore leagues found; pin one explicitly: ${names}`);
  }

  return candidates[0];
}

export function getPoe2ScoutLeagueApiBase({ realm = DEFAULT_REALM } = {}) {
  return `https://api.poe2scout.com/${realm}/Leagues`;
}

export const POE2SCOUT_REALM = DEFAULT_REALM;
