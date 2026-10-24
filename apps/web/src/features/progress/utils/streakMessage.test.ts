import { describe, expect, test } from "bun:test";

import { progressPercent, streakHeadline, streakNudge } from "./streakMessage";

describe("streakHeadline", () => {
  test("counts days, singular and plural", () => {
    expect(streakHeadline({ current: 1, longest: 1, activeToday: true })).toBe(
      "1 day in a row",
    );
    expect(streakHeadline({ current: 6, longest: 9, activeToday: false })).toBe(
      "6 days in a row",
    );
  });

  test("says so when there is none", () => {
    expect(streakHeadline({ current: 0, longest: 4, activeToday: false })).toBe(
      "No streak yet",
    );
  });
});

describe("streakNudge", () => {
  test("invites a first day to someone who never practised", () => {
    expect(streakNudge({ current: 0, longest: 0, activeToday: false })).toBe(
      "Solve a challenge or start an interview to begin one.",
    );
  });

  test("remembers a broken streak without scolding", () => {
    expect(streakNudge({ current: 0, longest: 5, activeToday: false })).toBe(
      "Your longest was 5 days. Practise today to start another.",
    );
  });

  test("asks for today's practice while a streak is still alive", () => {
    expect(streakNudge({ current: 3, longest: 3, activeToday: false })).toBe(
      "Practise today to keep it going.",
    );
    expect(streakNudge({ current: 3, longest: 8, activeToday: false })).toBe(
      "Practise today to keep it going. Your longest is 8 days.",
    );
  });

  test("is pleased once today is done", () => {
    expect(streakNudge({ current: 3, longest: 3, activeToday: true })).toBe(
      "Done for today, and your longest yet.",
    );
    expect(streakNudge({ current: 3, longest: 8, activeToday: true })).toBe(
      "Done for today. Your longest is 8 days.",
    );
  });
});

describe("progressPercent", () => {
  test("is a share of the target, capped", () => {
    expect(progressPercent(3, 10)).toBe(30);
    expect(progressPercent(12, 10)).toBe(100);
    expect(progressPercent(1, 0)).toBe(0);
  });
});
