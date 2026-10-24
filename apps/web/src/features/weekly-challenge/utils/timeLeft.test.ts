import { describe, expect, test } from "bun:test";

import { timeLeft } from "./timeLeft";

const NOW = Date.parse("2026-10-24T12:00:00.000Z");
const at = (ms: number) => new Date(NOW + ms).toISOString();
const HOUR = 3_600_000;

describe("timeLeft", () => {
  test("counts whole days while there are any", () => {
    expect(timeLeft(at(2.5 * 24 * HOUR), NOW)).toBe("2 days left");
    expect(timeLeft(at(24 * HOUR), NOW)).toBe("1 day left");
  });

  test("counts hours on the last day", () => {
    expect(timeLeft(at(5.9 * HOUR), NOW)).toBe("5 hours left");
    expect(timeLeft(at(HOUR), NOW)).toBe("1 hour left");
  });

  test("does not count minutes", () => {
    expect(timeLeft(at(20 * 60_000), NOW)).toBe("Less than an hour left");
  });

  test("says so once it is over", () => {
    expect(timeLeft(at(0), NOW)).toBe("Ends now");
    expect(timeLeft(at(-HOUR), NOW)).toBe("Ends now");
  });
});
