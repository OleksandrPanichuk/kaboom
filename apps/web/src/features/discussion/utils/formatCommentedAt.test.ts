import { describe, expect, test } from "bun:test";

import { formatCommentedAt } from "./formatCommentedAt";

const NOW = Date.parse("2026-10-16T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("formatCommentedAt", () => {
  test("says how long ago, then the date", () => {
    expect(formatCommentedAt(ago(20_000), NOW)).toBe("just now");
    expect(formatCommentedAt(ago(5 * 60_000), NOW)).toBe("5 minutes ago");
    expect(formatCommentedAt(ago(3 * 3_600_000), NOW)).toBe("3 hours ago");
    expect(formatCommentedAt(ago(26 * 3_600_000), NOW)).toBe("yesterday");
    expect(formatCommentedAt(ago(14 * 86_400_000), NOW)).toBe("2 weeks ago");
    expect(formatCommentedAt(ago(60 * 86_400_000), NOW)).toBe("Aug 17, 2026");
  });
});
