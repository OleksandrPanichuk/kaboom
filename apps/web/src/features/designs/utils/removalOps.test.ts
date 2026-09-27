import { createNode, type DesignEdge, emptyGraph } from "@repo/design";
import { describe, expect, test } from "bun:test";

import { removalOps } from "./removalOps";

const edge = (id: string, from: string, to: string): DesignEdge => ({
  id,
  from,
  to,
  kind: "sync-call",
  label: "",
  props: { share: 1, fanOut: 1, timeoutMs: 1_000 },
});

const graph = {
  ...emptyGraph(),
  nodes: ["a", "b", "c"].map((id) => createNode("service", { id })),
  edges: [edge("ab", "a", "b"), edge("bc", "b", "c")],
};

describe("removalOps", () => {
  test("removes edges first, then nodes", () => {
    expect(removalOps(graph, ["c"], ["ab"])).toEqual([
      { op: "remove-edge", id: "ab" },
      { op: "remove-node", id: "c" },
    ]);
  });

  test("leaves an edge of a removed node to the node's own removal", () => {
    expect(removalOps(graph, ["b"], ["ab", "bc"])).toEqual([
      { op: "remove-node", id: "b" },
    ]);
  });
});
