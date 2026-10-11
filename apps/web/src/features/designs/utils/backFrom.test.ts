import { describe, expect, test } from "bun:test";

import { backFrom, isBackPath } from "./backFrom";

const DESIGN = "/designs/0b6f1c2e-6f1e-4d7a-9a51-3c5f0f7e2a10";

describe("the way back from a schema", () => {
  test("returns to the problem or the design it was opened from", () => {
    expect(backFrom("/problems/flash-sale-checkout")).toEqual({
      to: "/problems/$slug",
      params: { slug: "flash-sale-checkout" },
      label: "Problem",
    });
    expect(backFrom(DESIGN)?.label).toBe("System design");
  });

  test("takes nothing else, so a link cannot send the user elsewhere", () => {
    expect(isBackPath("https://example.com")).toBe(false);
    expect(isBackPath("//example.com/problems/x")).toBe(false);
    expect(isBackPath("/settings")).toBe(false);
    expect(backFrom(null)).toBeNull();
  });
});
