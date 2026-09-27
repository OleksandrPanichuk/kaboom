import {
  applyOps,
  createGroup,
  createNode,
  type DesignGraph,
  type DesignOp,
  emptyGraph,
} from "@repo/design";
import { describe, expect, test } from "bun:test";

import { NEW_REGION } from "@/features/properties";

import { dissolveRegionOps, placementOps } from "./regionOps";
import { removalOps } from "./removalOps";

const graph = (): DesignGraph => ({
  ...emptyGraph(),
  groups: [createGroup({ id: "eu", kind: "region", label: "Region 1" })],
  nodes: [
    { ...createNode("service", { id: "api" }), groupId: "eu" },
    { ...createNode("sql-database", { id: "db" }), groupId: "eu" },
    createNode("cache", { id: "cache" }),
  ],
});

const run = (g: DesignGraph, ops: DesignOp[]) => {
  const result = applyOps(g, ops);

  if (!result.ok) throw new Error(result.message);

  return result.graph;
};

describe("regionOps", () => {
  test("creates a region for a node and names it after the ones there are", () => {
    const next = run(graph(), placementOps(graph(), ["cache"], NEW_REGION));
    const created = next.groups.find((group) => group.id !== "eu")!;

    expect(created.label).toBe("Region 2");
    expect(next.nodes.find((node) => node.id === "cache")!.groupId).toBe(
      created.id,
    );
  });

  test("removes a region once its last node moves out, in the same batch", () => {
    const g = graph();
    const next = run(g, placementOps(g, ["api", "db"], null));

    expect(next.groups).toEqual([]);
  });

  test("keeps a region that still holds a node", () => {
    const g = graph();
    const next = run(g, placementOps(g, ["api"], null));

    expect(next.groups.map((group) => group.id)).toEqual(["eu"]);
  });

  test("does nothing for nodes already where they are asked to go", () => {
    expect(placementOps(graph(), ["api"], "eu")).toEqual([]);
  });

  test("dissolves a region and keeps its nodes", () => {
    const g = graph();
    const next = run(g, dissolveRegionOps(g, "eu"));

    expect(next.groups).toEqual([]);
    expect(next.nodes.map((node) => node.groupId)).toEqual([null, null, null]);
  });

  test("deleting a region's last nodes removes the region too", () => {
    const g = graph();
    const next = run(g, removalOps(g, ["api", "db"], []));

    expect(next.groups).toEqual([]);
    expect(next.nodes.map((node) => node.id)).toEqual(["cache"]);
  });
});
