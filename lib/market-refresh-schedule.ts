export const MARKET_REFRESH_INTERVAL_HOURS = 6;
export const MARKET_REFRESH_MINUTE = 17;
export const SNAPSHOT_PROMPT_GRACE_MINUTES = 5;

export function getScheduledSnapshotRefreshSlot(now = new Date()) {
  const scheduledRefreshAt = new Date(now);
  const scheduledHour =
    now.getUTCHours() - (now.getUTCHours() % MARKET_REFRESH_INTERVAL_HOURS);
  scheduledRefreshAt.setUTCHours(scheduledHour, MARKET_REFRESH_MINUTE, 0, 0);

  if (scheduledRefreshAt > now) {
    scheduledRefreshAt.setUTCHours(
      scheduledRefreshAt.getUTCHours() - MARKET_REFRESH_INTERVAL_HOURS
    );
  }

  return scheduledRefreshAt.toISOString();
}

export function shouldShowScheduledSnapshotReminder(
  importedAt: string | undefined,
  dismissedSlot: string,
  now = new Date()
) {
  const scheduledRefreshAt = new Date(getScheduledSnapshotRefreshSlot(now));
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
