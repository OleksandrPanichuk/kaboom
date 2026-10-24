import { describe, expect, test } from "bun:test";

import { describeDesignAllowance, designsFull } from "./designAllowance";

describe("designAllowance", () => {
  test("says how many of the limit are used", () => {
    expect(describeDesignAllowance({ limit: 5, used: 3 })).toBe(
      "3 of 5 designs",
    );
  });

  test("never shows more than the limit, for someone who had more before it", () => {
    expect(describeDesignAllowance({ limit: 5, used: 9 })).toBe(
      "5 of 5 designs",
    );
  });

  test("says nothing when there is no limit", () => {
    expect(describeDesignAllowance({ limit: null, used: 40 })).toBeNull();
  });

  test("is full at the limit and past it, never without one", () => {
    expect(designsFull({ limit: 5, used: 4 })).toBe(false);
    expect(designsFull({ limit: 5, used: 5 })).toBe(true);
    expect(designsFull({ limit: 5, used: 9 })).toBe(true);
    expect(designsFull({ limit: null, used: 99 })).toBe(false);
  });
});
