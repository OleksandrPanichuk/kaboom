import {
  applyOps,
  createGroup,
  createNode,
  type DesignGraph,
  type DesignOp,
  emptyGraph,
} from "@repo/design";
import { describe, expect, test } from "bun:test";

import {
  NEW_PRIVATE_SUBNET,
  NEW_PUBLIC_SUBNET,
  NEW_REGION,
} from "@/features/properties";

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

describe("subnet placement", () => {
  const network = (): DesignGraph => ({
    ...emptyGraph(),
    groups: [
      createGroup({ id: "vpc", kind: "vpc", label: "Shop VPC" }),
      createGroup({
        id: "open",
        kind: "public-subnet",
        label: "Public",
        parentId: "vpc",
      }),
    ],
    nodes: [
      { ...createNode("load-balancer", { id: "lb" }), groupId: "open" },
      { ...createNode("service", { id: "app" }), groupId: "open" },
      createNode("client", { id: "users" }),
    ],
  });

  test("creates a VPC with the first subnet, then puts later subnets in it", () => {
    const first = run(emptyGraph(), [
      { op: "add-node", node: createNode("service", { id: "app" }) },
    ]);
    const once = run(first, placementOps(first, ["app"], NEW_PUBLIC_SUBNET));
    const vpc = once.groups.find((group) => group.kind === "vpc")!;
    const withDb = run(once, [
      { op: "add-node", node: createNode("sql-database", { id: "db" }) },
    ]);
    const twice = run(withDb, placementOps(withDb, ["db"], NEW_PRIVATE_SUBNET));

    expect(vpc.label).toBe("VPC 1");
    expect(
      twice.groups.map((group) => [group.kind, group.parentId, group.label]),
    ).toEqual([
      ["vpc", null, "VPC 1"],
      ["public-subnet", vpc.id, "Public subnet 1"],
      ["private-subnet", vpc.id, "Private subnet 1"],
    ]);
  });

  test("moving the last nodes out of a subnet removes it, and its VPC once that is empty too", () => {
    const g = network();
    const inside = run(g, placementOps(g, ["app"], NEW_PRIVATE_SUBNET));
    const out = run(inside, placementOps(inside, ["lb", "app"], null));

    expect(inside.groups.map((group) => group.id)).toContain("open");
    expect(out.groups).toEqual([]);
  });

  test("a new subnet in a VPC keeps the VPC when its old subnet empties", () => {
    const g = network();
    const next = run(g, placementOps(g, ["lb", "app"], NEW_PRIVATE_SUBNET));

    expect(next.groups.map((group) => group.kind)).toEqual([
      "vpc",
      "private-subnet",
    ]);
  });

  test("removing a VPC's only subnet removes the VPC it leaves empty", () => {
    const g = network();
    const next = run(g, dissolveRegionOps(g, "open"));

    expect(next.groups).toEqual([]);
    expect(next.nodes.every((node) => node.groupId === null)).toBe(true);
  });

  test("removing one of two subnets keeps the VPC", () => {
    const base = network();
    const g: DesignGraph = {
      ...base,
      groups: [
        ...base.groups,
        createGroup({
          id: "closed",
          kind: "private-subnet",
          label: "Private",
          parentId: "vpc",
        }),
      ],
      nodes: base.nodes.map((node) =>
        node.id === "app" ? { ...node, groupId: "closed" } : node,
      ),
    };
    const next = run(g, dissolveRegionOps(g, "open"));

    expect(next.groups.map((group) => group.id)).toEqual(["vpc", "closed"]);
  });

  test("dissolving a VPC dissolves its subnets and keeps every node", () => {
    const g = network();
    const next = run(g, dissolveRegionOps(g, "vpc"));

    expect(next.groups).toEqual([]);
    expect(next.nodes.map((node) => node.groupId)).toEqual([null, null, null]);
  });
});
