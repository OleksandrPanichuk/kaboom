import { describe, expect, test } from "bun:test";

import { skillTrends } from "./skillTrends";

const point = (
  skill: "design" | "scaling",
  score: number,
  weight: number,
  at: string,
) => ({
  skill,
  score,
  weight,
  source: "interview" as const,
  problem: { slug: "url-shortener", title: "URL shortener" },
  at,
});

describe("skillTrends", () => {
  test("follows each skill's weighted average after every review, as /skills/me reports it", () => {
    const [design, scaling] = skillTrends([
      point("design", 40, 20, "2026-10-01T10:00:00Z"),
      point("scaling", 90, 10, "2026-10-01T10:00:00Z"),
      point("design", 100, 10, "2026-10-02T10:00:00Z"),
      point("design", 70, 20, "2026-10-03T10:00:00Z"),
    ]);

    expect(design?.points.map((item) => item.value)).toEqual([40, 60, 64]);
    expect(design).toMatchObject({ current: 64, change: 4 });
    expect(scaling).toMatchObject({ current: 90, change: null });
  });

  test("has nothing to say before any review", () => {
    expect(skillTrends([])).toEqual([]);
  });
});
