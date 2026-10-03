import { describe, expect, test } from "bun:test";

import type { EdgeKind, NodeKind } from "../../catalogue";
import { createGroup, type DesignGraph, type DesignNode } from "../../graph";
import { edge, node } from "../load/fixtures";
import { evaluateNetwork } from "./evaluate-network";

const groups = [
  createGroup({ id: "vpc", kind: "vpc", label: "VPC" }),
  createGroup({
    id: "public",
    kind: "public-subnet",
    label: "Public",
    parentId: "vpc",
  }),
  createGroup({
    id: "private",
    kind: "private-subnet",
    label: "Private",
    parentId: "vpc",
  }),
];

const placed = (
  id: string,
  kind: NodeKind,
  groupId: string | null,
  props: Record<string, unknown> = {},
): DesignNode => ({ ...node(id, kind, props), groupId });

const design = (
  nodes: DesignNode[],
  edges: Array<[string, string, EdgeKind]>,
): DesignGraph => ({
  schemaVersion: 1,
  nodes,
  edges: edges.map(([from, to, kind]) => edge(from, to, kind)),
  groups,
});

const kinds = (graph: DesignGraph) =>
  evaluateNetwork(graph).findings.map(
    (finding) => `${finding.kind}:${finding.target.id}`,
  );

const threeTier = (
  extra: DesignNode[] = [],
  edges: Array<[string, string, EdgeKind]> = [],
) =>
  design(
    [
      placed("users", "client", null),
      placed("lb", "load-balancer", "public"),
      placed("app", "service", "private"),
      placed("db", "sql-database", "private"),
      placed("pay", "external-api", null),
      placed("nat", "nat-gateway", "public"),
      placed("sg-lb", "security-group", null, { fromInternet: true }),
      placed("sg-app", "security-group", null),
      placed("sg-db", "security-group", null),
      ...extra,
    ],
    [
      ["users", "lb", "sync-call"],
      ["lb", "app", "sync-call"],
      ["app", "db", "write"],
      ["app", "pay", "sync-call"],
      ["sg-lb", "lb", "protects"],
      ["sg-app", "app", "protects"],
      ["sg-db", "db", "protects"],
      ["sg-app", "sg-lb", "admits"],
      ["sg-db", "sg-app", "admits"],
      ...edges,
    ],
  );

const without = (graph: DesignGraph, id: string): DesignGraph => ({
  ...graph,
  nodes: graph.nodes.filter((item) => item.id !== id),
  edges: graph.edges.filter((item) => item.from !== id && item.to !== id),
});

const withProps = (
  graph: DesignGraph,
  id: string,
  props: Record<string, unknown>,
) => ({
  ...graph,
  nodes: graph.nodes.map((item) =>
    item.id === id
      ? ({ ...item, props: { ...item.props, ...props } } as DesignNode)
      : item,
  ),
});

describe("network evaluator rules", () => {
  test("a three-tier VPC with a security group per tier lets every call through and exposes nothing", () => {
    const result = evaluateNetwork(threeTier());

    expect(result.findings).toEqual([]);
    expect(result.connections.every((item) => item.allowed)).toBe(true);
    expect(result.exposed).toEqual(["lb"]);
  });

  test("a private subnet calls out only through a NAT gateway in a public subnet", () => {
    const noNat = without(threeTier(), "nat");
    const privateNat = {
      ...threeTier(),
      nodes: threeTier().nodes.map((item) =>
        item.id === "nat" ? { ...item, groupId: "private" } : item,
      ),
    };

    expect(kinds(noNat)).toEqual(["blocked-path:app-pay-sync-call"]);
    expect(kinds(privateNat)).toEqual(["blocked-path:app-pay-sync-call"]);
  });

  test("the internet cannot reach a private subnet", () => {
    const graph = threeTier([], [["users", "app", "sync-call"]]);

    expect(kinds(graph)).toContain("blocked-path:users-app-sync-call");
  });

  test("a security group admits a node, the members of another group, the whole VPC, or the internet", () => {
    const shut = {
      ...threeTier(),
      edges: threeTier().edges.filter(
        (item) => item.kind !== "admits" || item.to !== "sg-app",
      ),
    };
    const direct = threeTier([], [["sg-db", "app", "admits"]]);
    const directOnly = {
      ...direct,
      edges: direct.edges.filter(
        (item) => item.from !== "sg-db" || item.to !== "sg-app",
      ),
    };

    expect(kinds(shut)).toEqual(["blocked-path:app-db-write"]);
    expect(kinds(directOnly)).toEqual([]);
    expect(kinds(withProps(shut, "sg-db", { fromVpc: true }))).toEqual([
      "open-store:db",
    ]);
    expect(
      kinds(withProps(threeTier(), "sg-lb", { fromInternet: false })),
    ).toEqual(["blocked-path:users-lb-sync-call"]);
  });

  test("a store without a security group is open to the VPC, and one in a public subnet to the internet", () => {
    const unguarded = without(threeTier(), "sg-db");
    const publicDb = {
      ...unguarded,
      nodes: unguarded.nodes.map((item) =>
        item.id === "db" ? { ...item, groupId: "public" } : item,
      ),
    };

    expect(kinds(unguarded)).toEqual(["open-store:db"]);
    expect(kinds(publicDb)).toEqual(["exposed-store:db", "open-store:db"]);
  });

  test("a service the internet can reach is exposed, an entry point is not", () => {
    const opened = withProps(threeTier(), "sg-app", { fromInternet: true });
    const flat = {
      ...opened,
      nodes: opened.nodes.map((item) =>
        item.id === "app" ? { ...item, groupId: "public" } : item,
      ),
    };

    expect(kinds(flat)).toEqual(["exposed-service:app"]);
  });

  test("a store outside every VPC is on the internet", () => {
    const graph = threeTier(
      [placed("files", "object-storage", null)],
      [["app", "files", "write"]],
    );

    expect(kinds(graph)).toEqual(["exposed-store:files"]);
  });
});
