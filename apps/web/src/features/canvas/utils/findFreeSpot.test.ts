import { describe, expect, test } from "bun:test";

import { findFreeSpot } from "./findFreeSpot";

const CELL_X = 208 + 24;
const CELL_Y = 58 + 24;

describe("findFreeSpot", () => {
  test("keeps the wanted spot when nothing is there", () => {
    expect(findFreeSpot([{ x: 500, y: 500 }], { x: 0, y: 0 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  test("moves to the nearest cell that overlaps no node, a whole card away", () => {
    const spot = findFreeSpot([{ x: 0, y: 0 }], { x: 10, y: 5 });

    expect(
      Math.abs(spot.x - 0) >= CELL_X || Math.abs(spot.y - 0) >= CELL_Y,
    ).toBe(true);
    expect(
      Math.abs(spot.x - 10) <= CELL_X && Math.abs(spot.y - 5) <= CELL_Y,
    ).toBe(true);
  });

  test("adding several in one place never overlaps", () => {
    const taken: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < 8; i++) taken.push(findFreeSpot(taken, { x: 0, y: 0 }));

    for (const [i, a] of taken.entries()) {
      for (const b of taken.slice(i + 1)) {
        expect(
          Math.abs(a.x - b.x) >= CELL_X || Math.abs(a.y - b.y) >= CELL_Y,
        ).toBe(true);
      }
    }
  });
});
