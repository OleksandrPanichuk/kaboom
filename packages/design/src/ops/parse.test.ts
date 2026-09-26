import { describe, expect, test } from "bun:test";

import { createNode } from "../graph";
import { parseDesignOps } from "./parse";
import { MAX_OPS_PER_BATCH } from "./schema";

describe("parseDesignOps", () => {
  test("accepts well-formed ops and fills defaults", () => {
    const result = parseDesignOps([
      { op: "add-node", node: { id: "api", kind: "service", label: "API" } },
    ]);

    expect(result).toEqual({
      ok: true,
      ops: [
        {
          op: "add-node",
          node: createNode("service", { id: "api", label: "API" }),
        },
      ],
    });
  });

  test.each([
    ["an unknown op", [{ op: "teleport", id: "api" }], 0],
    [
      "an unknown node kind",
      [{ op: "add-node", node: { id: "x", kind: "mainframe", label: "" } }],
      0,
    ],
    [
      "a node kind change",
      [
        { op: "remove-edge", id: "e1" },
        { op: "update-node", id: "api", patch: { kind: "cache" } },
      ],
      1,
    ],
    ["an empty id", [{ op: "remove-node", id: "" }], 0],
  ])("refuses %s and points at it", (_, input, index) => {
    expect(parseDesignOps(input)).toMatchObject({
      ok: false,
      index,
      reason: "invalid-op",
    });
  });

  test.each([
    ["an empty batch", []],
    [
      "an oversized batch",
      Array.from({ length: MAX_OPS_PER_BATCH + 1 }, () => ({
        op: "remove-node",
        id: "x",
      })),
    ],
    ["something other than a list", { op: "remove-node", id: "x" }],
  ])("refuses %s", (_, input) => {
    expect(parseDesignOps(input)).toMatchObject({
      ok: false,
      reason: "invalid-op",
    });
  });
});
