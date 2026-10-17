import { describe, expect, test } from "bun:test";

import { weekBounds, weekStartOf } from "./practice-plans.helpers";

describe("practice plan weeks", () => {
  test("start on Monday in UTC", () => {
    expect(weekStartOf(new Date("2026-10-15T09:00:00Z"))).toBe("2026-10-12");
    expect(weekStartOf(new Date("2026-10-12T00:00:00Z"))).toBe("2026-10-12");
    expect(weekStartOf(new Date("2026-10-18T23:59:59Z"))).toBe("2026-10-12");
    expect(weekStartOf(new Date("2026-10-19T00:00:00Z"))).toBe("2026-10-19");
  });

  test("last seven days", () => {
    expect(weekBounds("2026-10-12")).toEqual({
      from: new Date("2026-10-12T00:00:00.000Z"),
      to: new Date("2026-10-19T00:00:00.000Z"),
    });
  });
});
