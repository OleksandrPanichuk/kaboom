import { describe, expect, test } from "bun:test";

import { storageRunway } from "./storage";

describe("storageRunway", () => {
  test("turns an insert rate into growth per day and days left", () => {
    expect(
      storageRunway({ storageGb: 500, insertsPerSecond: 100, recordSizeKb: 1 }),
    ).toEqual({ growthGbPerDay: 8.64, freeGb: 500, daysUntilFull: 500 / 8.64 });
  });

  test("counts only the space still free", () => {
    const runway = storageRunway({
      storageGb: 500,
      usedGb: 420,
      insertsPerSecond: 100,
      recordSizeKb: 1,
    });

    expect(runway.freeGb).toBe(80);
    expect(runway.daysUntilFull).toBeCloseTo(9.26, 2);
  });

  test("reports a full disk as zero days, never negative", () => {
    expect(
      storageRunway({
        storageGb: 500,
        usedGb: 600,
        insertsPerSecond: 10,
        recordSizeKb: 1,
      }).daysUntilFull,
    ).toBe(0);
  });

  test("never fills a store that nothing writes to", () => {
    expect(
      storageRunway({ storageGb: 500, insertsPerSecond: 0, recordSizeKb: 1 })
        .daysUntilFull,
    ).toBeNull();
  });
});
