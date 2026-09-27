import { describe, expect, test } from "bun:test";

import { pointsFor, rankFor } from "./ranking";

describe("ranking", () => {
  test("weighs a best score by the problem's difficulty", () => {
    expect(pointsFor(80, "easy")).toBe(80);
    expect(pointsFor(80, "medium")).toBe(160);
    expect(pointsFor(80, "hard")).toBe(240);
  });

  test("names the rank a total reaches and the one after it", () => {
    expect(rankFor(0)).toEqual({
      name: "Junior",
      points: 0,
      floorPoints: 0,
      nextName: "Middle",
      nextPoints: 100,
    });
    expect(rankFor(299)).toMatchObject({ name: "Middle", nextName: "Senior" });
    expect(rankFor(300)).toMatchObject({ name: "Senior" });
    expect(rankFor(5_000)).toEqual({
      name: "Principal",
      points: 5_000,
      floorPoints: 1_000,
      nextName: null,
      nextPoints: null,
    });
  });
});
