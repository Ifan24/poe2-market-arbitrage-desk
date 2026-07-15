const DEFAULT_REALM = "poe2";
const DEFAULT_PINNED_LEAGUE = "runes";

export function isHardcoreLeague(league) {
  const shortName = String(league?.ShortName || "").toLowerCase();
  const value = String(league?.Value || "").toLowerCase();
  return shortName.endsWith("hc") || value.startsWith("hc ") || value.startsWith("hardcore ");
}

export function selectActiveSoftcoreLeague(
  leagues,
  {
    pinnedShortName = process.env.POE2SCOUT_ACTIVE_LEAGUE_SHORT_NAME || DEFAULT_PINNED_LEAGUE
  } = {}
) {
  const candidates = leagues.filter((league) => league?.IsCurrent && !isHardcoreLeague(league));
  if (!candidates.length) {
    throw new Error("poe2scout has no current POE2 softcore league");
  }

  if (pinnedShortName) {
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
  return `https://poe2scout.com/api/${realm}/Leagues`;
}

export const POE2SCOUT_REALM = DEFAULT_REALM;
