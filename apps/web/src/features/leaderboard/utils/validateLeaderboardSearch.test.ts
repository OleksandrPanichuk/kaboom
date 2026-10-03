import { describe, expect, test } from "bun:test";

import { validateLeaderboardSearch } from "./validateLeaderboardSearch";

describe("validateLeaderboardSearch", () => {
  test("keeps this week and a known track, and drops the default and anything else", () => {
    expect(
      validateLeaderboardSearch({ period: "week", track: "devops" }),
    ).toEqual({ period: "week", track: "devops" });
    expect(
      validateLeaderboardSearch({ period: "all", track: "chess" }),
    ).toEqual({});
  });
});
