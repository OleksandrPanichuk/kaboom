import { describe, expect, test } from "bun:test";

import { validateProblemsSearch } from "./validateProblemsSearch";

describe("validateProblemsSearch", () => {
  test("keeps a known track and difficulty, and drops anything else", () => {
    expect(
      validateProblemsSearch({ track: "devops", difficulty: "hard" }),
    ).toEqual({ track: "devops", difficulty: "hard" });
    expect(
      validateProblemsSearch({ track: "frontend", difficulty: "brutal" }),
    ).toEqual({});
  });
});
