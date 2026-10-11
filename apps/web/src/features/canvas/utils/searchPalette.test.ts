import { describe, expect, test } from "bun:test";

import { searchPalette } from "./searchPalette";

const groups = [
  {
    track: "system-design" as const,
    label: "Data",
    kinds: ["cache" as const, "sql-database" as const],
  },
  {
    track: "system-design" as const,
    label: "Entry",
    kinds: ["load-balancer" as const],
  },
];

describe("searching the palette", () => {
  test("keeps every group when nothing is typed", () => {
    expect(searchPalette(groups, "  ")).toEqual(groups);
  });

  test("keeps only the kinds whose name matches, and drops empty groups", () => {
    expect(searchPalette(groups, "sql")).toEqual([
      { ...groups[0]!, kinds: ["sql-database"] },
    ]);
  });
});
