import {
  createEdge,
  createGroup,
  createNode,
  type DesignGraph,
  emptyGraph,
} from "@repo/design";
import { describe, expect, test } from "bun:test";

import {
  groupsWithin,
  hostsFor,
  nodesWithin,
  replicaLabels,
  sharedGroupId,
} from "./inspectorFacts";

const graph: DesignGraph = {
  ...emptyGraph(),
  groups: [
    createGroup({ id: "eu", kind: "region", label: "EU" }),
    createGroup({
      id: "shop",
      kind: "database",
      label: "Shop",
      parentId: "eu",
      engine: "postgres",
    }),
  ],
  nodes: [
    {
      ...createNode("sql-database", { id: "db", label: "Orders" }),
      groupId: "eu",
    },
    { ...createNode("sql-database", { id: "copy", label: "Copy" }) },
    { ...createNode("nosql-database", { id: "docs" }) },
    { ...createNode("table", { id: "orders" }), groupId: "shop" },
  ],
  edges: [createEdge({ id: "r", from: "db", to: "copy", kind: "replication" })],
};

describe("inspector facts", () => {
  test("find what a group holds, nested groups included", () => {
    expect(groupsWithin(graph, "eu")).toEqual(["eu", "shop"]);
    expect(nodesWithin(graph, "eu").map((node) => node.id)).toEqual([
      "db",
      "orders",
    ]);
  });

  test("offer a database the nodes of its family to live on", () => {
    expect(hostsFor(graph, graph.groups[1]!)).toEqual([
      { id: "db", label: "Orders" },
      { id: "copy", label: "Copy" },
    ]);
  });

  test("name a primary's replicas, and a group shared by every selected node", () => {
    expect(replicaLabels(graph, "db")).toEqual(["Copy"]);
    expect(sharedGroupId(graph.nodes.slice(0, 1))).toBe("eu");
    expect(sharedGroupId(graph.nodes.slice(0, 2))).toBeNull();
  });
});
