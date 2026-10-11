import { describe, expect, test } from "bun:test";

import { matchesProblem } from "./matchesProblem";

const problem = {
  title: "URL shortener",
  summary: "Turn long links into short ones",
  tags: ["caching", "read-heavy"],
};

describe("finding a problem", () => {
  test("matches every word against the title, summary and tags", () => {
    const all = { status: "all" as const };

    expect(matchesProblem(problem, undefined, { ...all, query: "" })).toBe(
      true,
    );
    expect(
      matchesProblem(problem, undefined, { ...all, query: "short CACHING" }),
    ).toBe(true);
    expect(
      matchesProblem(problem, undefined, { ...all, query: "short queue" }),
    ).toBe(false);
  });

  test("keeps the problems tried or not yet tried", () => {
    const tried = { submissions: 2 };

    expect(matchesProblem(problem, tried, { query: "", status: "tried" })).toBe(
      true,
    );
    expect(matchesProblem(problem, tried, { query: "", status: "new" })).toBe(
      false,
    );
    expect(
      matchesProblem(problem, undefined, { query: "", status: "new" }),
    ).toBe(true);
  });
});
