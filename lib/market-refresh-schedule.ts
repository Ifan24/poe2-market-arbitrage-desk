export const DEFAULT_MARKET_REFRESH_INTERVAL_HOURS = 6;
export const MARKET_REFRESH_MINUTE = 17;
export const SNAPSHOT_PROMPT_GRACE_MINUTES = 5;

// Slots are aligned to UTC midnight, so the interval must divide a day evenly.
const SUPPORTED_REFRESH_INTERVAL_HOURS = [1, 2, 3, 4, 6, 8, 12, 24];

export function normalizeRefreshIntervalHours(value: unknown) {
  const hours = Number(value);
  return SUPPORTED_REFRESH_INTERVAL_HOURS.includes(hours) ? hours : DEFAULT_MARKET_REFRESH_INTERVAL_HOURS;
}

export function getMarketFreshnessThresholds(intervalHours: unknown) {
  const intervalMinutes = normalizeRefreshIntervalHours(intervalHours) * 60;
  return {
    expectedRefreshIntervalMinutes: intervalMinutes,
    // Stale after one missed refresh, very stale after two.
    staleAfterMinutes: intervalMinutes + 60,
    veryStaleAfterMinutes: intervalMinutes * 2 + 60
  };
}

export function getScheduledSnapshotRefreshSlot(
  now = new Date(),
  intervalHours = DEFAULT_MARKET_REFRESH_INTERVAL_HOURS
) {
  const hours = normalizeRefreshIntervalHours(intervalHours);
  const scheduledRefreshAt = new Date(now);
  const scheduledHour = now.getUTCHours() - (now.getUTCHours() % hours);
  scheduledRefreshAt.setUTCHours(scheduledHour, MARKET_REFRESH_MINUTE, 0, 0);

  if (scheduledRefreshAt > now) {
    scheduledRefreshAt.setUTCHours(scheduledRefreshAt.getUTCHours() - hours);
  }

  return scheduledRefreshAt.toISOString();
}

export function shouldShowScheduledSnapshotReminder(
  importedAt: string | undefined,
  dismissedSlot: string,
  now = new Date(),
  intervalHours = DEFAULT_MARKET_REFRESH_INTERVAL_HOURS
) {
  const scheduledRefreshAt = new Date(getScheduledSnapshotRefreshSlot(now, intervalHours));
  const promptAt = new Date(
    scheduledRefreshAt.getTime() + SNAPSHOT_PROMPT_GRACE_MINUTES * 60 * 1000
  );

  if (now < promptAt) {
    return false;
  }

  if (dismissedSlot === scheduledRefreshAt.toISOString()) {
    return false;
  }

  if (!importedAt) {
    return true;
  }

  const importedAtMs = Date.parse(importedAt);
  return Number.isNaN(importedAtMs) || importedAtMs < scheduledRefreshAt.getTime();
}
