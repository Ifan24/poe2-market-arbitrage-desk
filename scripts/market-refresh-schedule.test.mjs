import test from "node:test";
import assert from "node:assert/strict";

import {
  getScheduledSnapshotRefreshSlot,
  shouldShowScheduledSnapshotReminder
} from "../lib/market-refresh-schedule.ts";

test("scheduled refresh slots follow the six-hour UTC cron", () => {
  assert.equal(
    getScheduledSnapshotRefreshSlot(new Date("2026-08-01T06:22:00.000Z")),
    "2026-08-01T06:17:00.000Z"
  );
  assert.equal(
    getScheduledSnapshotRefreshSlot(new Date("2026-08-01T00:10:00.000Z")),
    "2026-07-31T18:17:00.000Z"
  );
});

test("snapshot reminder waits for grace and respects fresh or dismissed slots", () => {
  const beforePrompt = new Date("2026-08-01T06:21:59.000Z");
  const afterPrompt = new Date("2026-08-01T06:22:00.000Z");
  const slot = "2026-08-01T06:17:00.000Z";

  assert.equal(shouldShowScheduledSnapshotReminder(undefined, "", beforePrompt), false);
  assert.equal(
    shouldShowScheduledSnapshotReminder("2026-08-01T00:30:00.000Z", "", afterPrompt),
    true
  );
  assert.equal(
    shouldShowScheduledSnapshotReminder("2026-08-01T06:18:00.000Z", "", afterPrompt),
    false
  );
  assert.equal(shouldShowScheduledSnapshotReminder(undefined, slot, afterPrompt), false);
});
