import { createNode, emptyGraph } from "@repo/design";
import { describe, expect, test } from "bun:test";

import { paletteTracks } from "./paletteTracks";

describe("paletteTracks", () => {
  test("offers a problem's own track first, then the tracks of what it already draws", () => {
    const graph = {
      ...emptyGraph(),
      nodes: [
        createNode("table", { id: "orders" }),
        createNode("service", { id: "checkout" }),
        createNode("sql-database", { id: "db" }),
      ],
    };

    expect(paletteTracks("data-model", graph)).toEqual([
      "data-model",
      "system-design",
    ]);
    expect(paletteTracks("data-model", emptyGraph())).toEqual(["data-model"]);
  });

  test("leaves a sandbox design every track", () => {
    expect(paletteTracks(undefined, emptyGraph())).toBeUndefined();
  });
});
