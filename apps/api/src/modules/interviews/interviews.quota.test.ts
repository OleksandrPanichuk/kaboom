import { describe, expect, test } from "bun:test";

import { quotaWindow } from "./interviews.quota";

describe("quotaWindow", () => {
  test("a day runs from midnight UTC to the next", () => {
    const window = quotaWindow("day", new Date("2026-10-22T15:30:00Z"));

    expect(window.from.toISOString()).toBe("2026-10-22T00:00:00.000Z");
    expect(window.resetsAt.toISOString()).toBe("2026-10-23T00:00:00.000Z");
  });

  test("a week starts on Monday, and Sunday still belongs to the week before", () => {
    const wednesday = quotaWindow("week", new Date("2026-10-21T09:00:00Z"));
    const sunday = quotaWindow("week", new Date("2026-10-25T23:59:59Z"));
    const monday = quotaWindow("week", new Date("2026-10-26T00:00:00Z"));

    expect(wednesday.from.toISOString()).toBe("2026-10-19T00:00:00.000Z");
    expect(sunday.from.toISOString()).toBe("2026-10-19T00:00:00.000Z");
    expect(sunday.resetsAt.toISOString()).toBe("2026-10-26T00:00:00.000Z");
    expect(monday.from.toISOString()).toBe("2026-10-26T00:00:00.000Z");
  });
});
