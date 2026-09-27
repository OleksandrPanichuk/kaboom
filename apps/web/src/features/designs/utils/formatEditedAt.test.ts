import { describe, expect, test } from "bun:test";

import { formatEditedAt } from "./formatEditedAt";

const now = new Date("2026-09-27T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

describe("formatEditedAt", () => {
  test("says just now under a minute", () => {
    expect(formatEditedAt(ago(30_000), now)).toBe("Edited just now");
  });

  test("counts minutes, hours and days", () => {
    expect(formatEditedAt(ago(5 * 60_000), now)).toBe("Edited 5 minutes ago");
    expect(formatEditedAt(ago(60 * 60_000), now)).toBe("Edited 1 hour ago");
    expect(formatEditedAt(ago(24 * 60 * 60_000), now)).toBe("Edited yesterday");
    expect(formatEditedAt(ago(3 * 24 * 60 * 60_000), now)).toBe(
      "Edited 3 days ago",
    );
  });

  test("shows a date after a week, with the year only when it differs", () => {
    expect(formatEditedAt("2026-09-03T12:00:00Z", now)).toBe("Edited Sep 3");
    expect(formatEditedAt("2025-09-03T12:00:00Z", now)).toBe(
      "Edited Sep 3, 2025",
    );
  });
});
