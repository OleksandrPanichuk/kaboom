import { describe, expect, test } from "bun:test";

import {
  formatClock,
  formatShare,
  formatWithUnit,
  parseClock,
  parseShare,
  unitOf,
} from "./fieldUnits";

describe("field units", () => {
  test("reads a share, a time and a suffix off the schema", () => {
    expect(
      unitOf("availability", { type: "number", minimum: 0, maximum: 1 }),
    ).toEqual({ kind: "share" });
    expect(
      unitOf("min", { type: "integer", minimum: 1, maximum: 1 }),
    ).toBeNull();
    expect(unitOf("durationSeconds", { type: "integer" })).toEqual({
      kind: "clock",
    });
    expect(
      unitOf("faultAt", { type: "number", title: "Fault starts at (s)" }),
    ).toEqual({ kind: "clock" });
    expect(unitOf("until", { type: "number" })).toEqual({ kind: "clock" });
    expect(unitOf("maxP99Ms", { type: "number" })).toEqual({
      kind: "suffix",
      suffix: "ms",
    });
    expect(unitOf("minutes", { type: "integer" })).toEqual({
      kind: "suffix",
      suffix: "min",
    });
    expect(unitOf("title", { type: "string" })).toBeNull();
  });

  test("writes and reads times as minutes and seconds", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(245)).toBe("4:05");
    expect(formatClock(600)).toBe("10:00");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(4.5)).toBe("0:04.5");
    expect(parseClock("4:05")).toBe(245);
    expect(parseClock("90")).toBe(90);
    expect(parseClock("1:02:05")).toBe(3725);
    expect(parseClock("0:04.5")).toBe(4.5);
    expect(parseClock("1:75")).toBeNull();
    expect(parseClock("soon")).toBeNull();
  });

  test("shows a share as a percentage without float noise", () => {
    expect(formatShare(0.999)).toBe("99.9");
    expect(formatShare(0.05)).toBe("5");
    expect(parseShare("99.9")).toBe(0.999);
    expect(parseShare("")).toBeNull();
    expect(formatWithUnit(0.999, { kind: "share" })).toBe("99.9%");
    expect(formatWithUnit(3, { kind: "suffix", suffix: "×" })).toBe("3×");
    expect(formatWithUnit(200, { kind: "suffix", suffix: "ms" })).toBe(
      "200 ms",
    );
  });
});
