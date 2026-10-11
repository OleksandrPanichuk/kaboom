import {
  applyOps,
  createNode,
  type DesignGraph,
  emptyGraph,
} from "@repo/design";
import { describe, expect, test } from "bun:test";

import { homeOps } from "./newNode";

const run = (graph: DesignGraph, ops: ReturnType<typeof homeOps>) => {
  const result = applyOps(graph, ops);

  if (!result.ok) throw new Error(result.message);

  return result.graph;
};

describe("homeOps", () => {
  test("puts a collection into the design's MongoDB database, creating it with the first", () => {
    const first = run(
      emptyGraph(),
      homeOps(emptyGraph(), createNode("collection", { id: "orders" })),
    );
    const second = run(
      first,
      homeOps(first, createNode("collection", { id: "users" })),
    );

    expect(second.groups).toHaveLength(1);
    expect(second.groups[0]).toMatchObject({
      kind: "database",
      engine: "mongodb",
    });
    expect(second.nodes.map((node) => node.groupId)).toEqual([
      second.groups[0]!.id,
      second.groups[0]!.id,
    ]);
  });

  test("adds anything else as it is", () => {
    const node = createNode("table", { id: "orders" });

    expect(homeOps(emptyGraph(), node)).toEqual([{ op: "add-node", node }]);
  });
});
