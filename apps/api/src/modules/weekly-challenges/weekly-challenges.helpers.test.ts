import { describe, expect, test } from "bun:test";

import type { FeaturedProblem, FeaturedWeek } from "./weekly-challenge.entity";
import { pickWeekly } from "./weekly-challenges.helpers";

const problem = (
  slug: string,
  track: FeaturedProblem["track"] = "system-design",
): FeaturedProblem => ({
  id: slug,
  slug,
  title: slug,
  summary: "",
  track,
  difficulty: "easy",
});

const week = (weekStart: string, featured: FeaturedProblem): FeaturedWeek => ({
  weekStart,
  problemId: featured.id,
  track: featured.track,
});

describe("pickWeekly", () => {
  test("answers nothing without a problem", () => {
    expect(pickWeekly([], [])).toBeNull();
  });

  test("takes the first by slug when nothing has been featured", () => {
    expect(pickWeekly([problem("b"), problem("a")], [])?.slug).toBe("a");
  });

  test("prefers a problem that has never been featured", () => {
    const a = problem("a");
    const b = problem("b");

    expect(pickWeekly([a, b], [week("2026-10-12", a)])?.slug).toBe("b");
  });

  test("moves to another track than last week's when it can", () => {
    const a = problem("a");
    const b = problem("b");
    const c = problem("c", "devops");

    expect(pickWeekly([a, b, c], [week("2026-10-12", a)])?.slug).toBe("c");
  });

  test("brings back the one featured longest ago once all have had a turn", () => {
    const a = problem("a");
    const b = problem("b");
    const history = [week("2026-10-05", a), week("2026-10-12", b)];

    expect(pickWeekly([a, b], history)?.slug).toBe("a");
  });

  test("does not depend on the order of the history", () => {
    const a = problem("a");
    const b = problem("b");
    const history = [week("2026-10-05", a), week("2026-10-12", b)];

    expect(pickWeekly([a, b], [...history].reverse())?.slug).toBe("a");
  });
});
