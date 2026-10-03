import { describe, expect, test } from "bun:test";

import { checkNumber, fromDisplay, optionLabel, toDisplay } from "./fieldValue";

const control = { type: "number" as const, min: 1, max: 10_000, integer: true };

describe("field values", () => {
  test("shows a ratio as a percentage and reads it back", () => {
    expect(toDisplay(0.7, "ratio")).toBe("70");
    expect(fromDisplay("70", "ratio")).toBe(0.7);
    expect(fromDisplay("33.3", "ratio")).toBe(0.333);
    expect(toDisplay(500, "req/s")).toBe("500");
  });

  test("reads an empty or malformed input as not a number", () => {
    expect(fromDisplay("", "ms")).toBeNaN();
    expect(fromDisplay("abc", "ms")).toBeNaN();
  });

  test("explains a number outside what the prop takes", () => {
    expect(checkNumber(Number.NaN, control, "count")).toBe("Enter a number.");
    expect(checkNumber(2.5, control, "count")).toBe("Use a whole number.");
    expect(checkNumber(0, control, "count")).toBe("Use at least 1.");
    expect(checkNumber(20_000, control, "count")).toBe("Use at most 10,000.");
    expect(
      checkNumber(
        1.5,
        { ...control, min: 0.1, max: 1, integer: false },
        "ratio",
      ),
    ).toBe("Use at most 100%.");
    expect(checkNumber(3, control, "count")).toBeNull();
  });

  test("labels choices for people", () => {
    expect(optionLabel("lru")).toBe("LRU");
    expect(optionLabel("l7")).toBe("L7");
    expect(optionLabel("least-connections")).toBe("Least connections");
    expect(optionLabel("automatic")).toBe("Automatic");
    expect(optionLabel("db.r6g.large")).toBe("db.r6g.large");
  });
});
