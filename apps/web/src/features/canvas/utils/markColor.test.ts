import { technologies } from "@repo/design";
import { describe, expect, test } from "bun:test";

import { TECHNOLOGY_ICONS } from "@/features/canvas/constants";

import { markColor } from "./markColor";

describe("markColor", () => {
  test("keeps a brand colour that shows on white", () => {
    expect(markColor("4169E1", "#3f3f46")).toBe("#4169E1");
  });

  test("falls back for a brand colour too pale to see on white", () => {
    expect(markColor("AECBFA", "#1a73e8")).toBe("#1a73e8");
  });
});

describe("technology marks", () => {
  test("every product has a brand icon or a monogram short enough for its tile", () => {
    for (const technology of Object.values(technologies)) {
      const icon = technology.icon
        ? TECHNOLOGY_ICONS[technology.icon]
        : undefined;

      expect(
        icon !== undefined || technology.monogram.length <= 3,
        technology.id,
      ).toBe(true);
    }
  });

  test("every icon a product names is one the app bundles", () => {
    for (const technology of Object.values(technologies)) {
      if (technology.icon === undefined) continue;

      expect(TECHNOLOGY_ICONS[technology.icon], technology.id).toBeDefined();
    }
  });

  test("every brand icon is used by a product", () => {
    const used = new Set(
      Object.values(technologies).map((technology) => technology.icon),
    );

    expect(
      Object.keys(TECHNOLOGY_ICONS).filter((slug) => !used.has(slug)),
    ).toEqual([]);
  });
});
