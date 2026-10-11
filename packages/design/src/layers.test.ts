import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { describe, expect, test } from "bun:test";

const ROOT = import.meta.dir;

const LAYERS: Readonly<Record<string, readonly string[]>> = {
  pricing: [],
  estimate: [],
  catalogue: ["pricing"],
  graph: ["catalogue"],
  handbook: ["catalogue"],
  build: ["catalogue", "graph"],
  "data-model": ["catalogue", "graph"],
  cost: ["catalogue", "graph", "pricing"],
  ops: ["catalogue", "graph", "data-model"],
  lints: ["catalogue", "graph", "data-model"],
  evaluate: ["catalogue", "graph", "data-model"],
};

const sources = (folder: string): string[] =>
  readdirSync(folder).flatMap((entry) => {
    const path = join(folder, entry);

    if (statSync(path).isDirectory()) return sources(path);

    return path.endsWith(".ts") && !path.endsWith(".test.ts") ? [path] : [];
  });

const layerOf = (path: string): string | null => {
  const [first, second] = relative(ROOT, path).split("/");

  return second === undefined ? null : (first ?? null);
};

const importedLayer = (path: string): string | null => {
  const [first] = relative(ROOT, path).split("/");

  return first !== undefined && first in LAYERS ? first : null;
};

const crossings = (): string[] =>
  sources(ROOT).flatMap((file) => {
    const from = layerOf(file);

    if (from === null) return [];

    return [...readFileSync(file, "utf8").matchAll(/from "(\.[^"]+)"/g)]
      .map((match) => importedLayer(resolve(dirname(file), match[1]!)))
      .filter(
        (to): to is string =>
          to !== null && to !== from && !(LAYERS[from] ?? []).includes(to),
      )
      .map((to) => `${relative(ROOT, file)} imports ${to}`);
  });

describe("layers", () => {
  test("every folder is a known layer", () => {
    const folders = readdirSync(ROOT).filter((entry) =>
      statSync(join(ROOT, entry)).isDirectory(),
    );

    expect(folders.filter((folder) => !(folder in LAYERS))).toEqual([]);
  });

  test("a folder imports only the layers below it", () => {
    expect(crossings()).toEqual([]);
  });
});
