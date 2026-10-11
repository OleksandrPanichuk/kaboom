import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, test } from "bun:test";

const ROOT = join(import.meta.dir, "..");
const SCANNED = ["features", "components", "routes"];
const EXEMPT = ["components/ui/"];

const PALETTE =
  /\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline|divide|placeholder)-(?:zinc|slate|gray|neutral|stone|indigo|emerald|green|amber|orange|yellow|red)-\d{2,3}\b|\bbg-white\b|\bborder-black\/|var\(--color-(?:zinc|indigo|emerald|amber|red)-/g;

const files = (folder: string): string[] =>
  readdirSync(folder).flatMap((entry) => {
    const path = join(folder, entry);

    if (statSync(path).isDirectory()) return files(path);

    return /\.tsx?$/.test(path) && !path.endsWith(".test.ts") ? [path] : [];
  });

describe("colours", () => {
  test("come from the theme's tokens, so both themes follow", () => {
    const found = SCANNED.flatMap((folder) => files(join(ROOT, folder)))
      .filter(
        (path) =>
          !EXEMPT.some((exempt) => relative(ROOT, path).startsWith(exempt)),
      )
      .flatMap((path) =>
        [...readFileSync(path, "utf8").matchAll(PALETTE)].map(
          (match) => `${relative(ROOT, path)}: ${match[0]}`,
        ),
      );

    expect(found).toEqual([]);
  });
});
