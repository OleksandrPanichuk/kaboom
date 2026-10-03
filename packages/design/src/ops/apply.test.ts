import { describe, expect, test } from "bun:test";

import {
  canonicalize,
  createEdge,
  createGroup,
  createNode,
  type DesignGraph,
  emptyGraph,
} from "../graph";
import { applyOps } from "./apply";
import type { DesignOp } from "./schema";

const base = (): DesignGraph => ({
  ...emptyGraph(),
  groups: [createGroup({ id: "eu", kind: "region", label: "EU" })],
  nodes: [
    createNode("client", { id: "users" }),
    createNode("load-balancer", { id: "lb" }),
    createNode("service", { id: "api" }),
    createNode("sql-database", { id: "db" }),
    createNode("sql-database", { id: "replica" }),
  ],
  edges: [
    createEdge({ id: "e1", from: "users", to: "lb", kind: "sync-call" }),
    createEdge({ id: "e2", from: "lb", to: "api", kind: "sync-call" }),
    createEdge({ id: "e3", from: "api", to: "db", kind: "write" }),
  ],
});

const apply = (ops: DesignOp[], graph = base()) => {
  const result = applyOps(graph, ops);

  if (!result.ok) {
    throw new Error(`${result.reason}: ${result.message}`);
  }

  return result;
};

const rejection = (ops: DesignOp[], graph = base()) => {
  const result = applyOps(graph, ops);

  if (result.ok) throw new Error("expected a rejection");

  return result;
};

const expectRoundTrip = (ops: DesignOp[], graph = base()) => {
  const { graph: next, inverse } = apply(ops, graph);
  const back = apply(inverse, next);

  expect(canonicalize(back.graph)).toBe(canonicalize(graph));
};

describe("applyOps", () => {
  test("adds a node with its defaults and undoes it", () => {
    const { graph } = apply([
      { op: "add-node", node: createNode("cache", { id: "redis" }) },
    ]);

    expect(graph.nodes.at(-1)).toMatchObject({
      id: "redis",
      props: { hitRatio: 0.8 },
    });
    expectRoundTrip([
      { op: "add-node", node: createNode("cache", { id: "redis" }) },
    ]);
  });

  test("removes a node with the edges that touch it, and restores both", () => {
    const { graph, inverse } = apply([{ op: "remove-node", id: "api" }]);

    expect(graph.nodes.map((node) => node.id)).not.toContain("api");
    expect(graph.edges.map((edge) => edge.id)).toEqual(["e1"]);
    expect(inverse.map((op) => op.op)).toEqual([
      "add-node",
      "add-edge",
      "add-edge",
    ]);
    expectRoundTrip([{ op: "remove-node", id: "api" }]);
  });

  test("merges a props patch, validates the result, and undoes only what changed", () => {
    const ops: DesignOp[] = [
      {
        op: "update-node",
        id: "api",
        patch: { label: "Orders API", props: { replicas: 4 } },
      },
    ];

    const { graph, inverse } = apply(ops);
    const api = graph.nodes.find((node) => node.id === "api");

    expect(api).toMatchObject({
      label: "Orders API",
      props: { replicas: 4, capacityRpsPerReplica: 500 },
    });
    expect(inverse).toEqual([
      {
        op: "update-node",
        id: "api",
        patch: { label: "Service", props: { replicas: 2 } },
      },
    ]);
    expectRoundTrip(ops);
  });

  test("moves a node into a group and back", () => {
    expectRoundTrip([
      { op: "update-node", id: "api", patch: { groupId: "eu" } },
    ]);
  });

  test("updates an edge and undoes it", () => {
    const ops: DesignOp[] = [
      {
        op: "update-edge",
        id: "e3",
        patch: { kind: "sync-call", props: { timeoutMs: 250 } },
      },
    ];

    const { graph } = apply(ops);

    expect(graph.edges.find((edge) => edge.id === "e3")).toMatchObject({
      kind: "sync-call",
      props: { timeoutMs: 250, share: 1 },
    });
    expectRoundTrip(ops);
  });

  test("adds and removes a group", () => {
    expectRoundTrip([
      {
        op: "add-group",
        group: createGroup({ id: "us", kind: "region", label: "US" }),
      },
      { op: "remove-group", id: "us" },
    ]);
  });

  test("renames a group and undoes it", () => {
    const { graph, inverse } = apply([
      { op: "update-group", id: "eu", patch: { label: "Europe" } },
    ]);

    expect(graph.groups[0]!.label).toBe("Europe");
    expect(apply(inverse, graph).graph.groups[0]!.label).toBe("EU");
  });

  test("undoes a whole batch in reverse order", () => {
    expectRoundTrip([
      { op: "add-node", node: createNode("cache", { id: "redis" }) },
      {
        op: "add-edge",
        edge: createEdge({ id: "e4", from: "api", to: "redis", kind: "read" }),
      },
      { op: "update-node", id: "redis", patch: { groupId: "eu" } },
      { op: "remove-node", id: "db" },
    ]);
  });

  test("lets a load balancer fan out to many targets", () => {
    apply([
      { op: "add-node", node: createNode("service", { id: "api-2" }) },
      {
        op: "add-edge",
        edge: createEdge({
          id: "e4",
          from: "lb",
          to: "api-2",
          kind: "sync-call",
        }),
      },
    ]);
  });

  test("refuses an edge into a client, which only sends requests", () => {
    const refused = rejection([
      {
        op: "add-edge",
        edge: createEdge({
          id: "back",
          from: "api",
          to: "users",
          kind: "sync-call",
        }),
      },
    ]);

    expect(refused.reason).toBe("invalid-edge");
    expect(refused.message).toContain("a client");
  });

  test("allows replication between two stores of one replicable kind", () => {
    apply([
      {
        op: "add-edge",
        edge: createEdge({
          id: "r1",
          from: "db",
          to: "replica",
          kind: "replication",
        }),
      },
    ]);
  });

  test("allows a deployment to mount a secret, be scaled and be watched", () => {
    apply([
      { op: "add-node", node: createNode("k8s-deployment", { id: "app" }) },
      { op: "add-node", node: createNode("hpa", { id: "hpa" }) },
      { op: "add-node", node: createNode("secret", { id: "keys" }) },
      { op: "add-node", node: createNode("alert", { id: "pager" }) },
      {
        op: "add-edge",
        edge: createEdge({ id: "m1", from: "app", to: "keys", kind: "mounts" }),
      },
      {
        op: "add-edge",
        edge: createEdge({ id: "s1", from: "hpa", to: "app", kind: "scales" }),
      },
      {
        op: "add-edge",
        edge: createEdge({
          id: "w1",
          from: "pager",
          to: "app",
          kind: "watches",
        }),
      },
    ]);
  });

  test("allows a change feed from a database and a lock on a coordination service", () => {
    apply([
      { op: "add-node", node: createNode("search-index", { id: "search" }) },
      { op: "add-node", node: createNode("scheduler", { id: "cron" }) },
      { op: "add-node", node: createNode("coordination", { id: "zk" }) },
      {
        op: "add-edge",
        edge: createEdge({
          id: "f1",
          from: "db",
          to: "search",
          kind: "change-feed",
        }),
      },
      {
        op: "add-edge",
        edge: createEdge({ id: "l1", from: "cron", to: "zk", kind: "lock" }),
      },
      {
        op: "add-edge",
        edge: createEdge({
          id: "c1",
          from: "cron",
          to: "api",
          kind: "sync-call",
        }),
      },
    ]);
  });

  test("never mutates the graph it was given", () => {
    const graph = base();
    const before = canonicalize(graph);

    applyOps(graph, [
      { op: "remove-node", id: "api" },
      { op: "update-node", id: "db", patch: { props: { shards: 4 } } },
    ]);

    expect(canonicalize(graph)).toBe(before);
  });

  test("applies nothing when one op of the batch is refused", () => {
    const result = rejection([
      { op: "add-node", node: createNode("cache", { id: "redis" }) },
      { op: "remove-node", id: "ghost" },
    ]);

    expect(result).toMatchObject({
      ok: false,
      index: 1,
      reason: "unknown-node",
    });
  });

  test.each<[string, DesignOp[], string]>([
    [
      "a duplicate id",
      [{ op: "add-node", node: createNode("cache", { id: "e1" }) }],
      "duplicate-id",
    ],
    [
      "an unknown group",
      [
        {
          op: "add-node",
          node: createNode("cache", { id: "c", groupId: "mars" }),
        },
      ],
      "unknown-group",
    ],
    ["an unknown edge", [{ op: "remove-edge", id: "e9" }], "unknown-edge"],
    [
      "props that fail the kind's schema",
      [{ op: "update-node", id: "api", patch: { props: { replicas: 0 } } }],
      "invalid-props",
    ],
    [
      "a prop the kind does not have",
      [{ op: "update-node", id: "api", patch: { props: { hitRatio: 0.5 } } }],
      "invalid-props",
    ],
    [
      "an edge to a missing node",
      [
        {
          op: "add-edge",
          edge: createEdge({
            id: "e9",
            from: "api",
            to: "ghost",
            kind: "read",
          }),
        },
      ],
      "unknown-node",
    ],
    [
      "an edge from a node to itself",
      [
        {
          op: "add-edge",
          edge: createEdge({
            id: "e9",
            from: "api",
            to: "api",
            kind: "sync-call",
          }),
        },
      ],
      "invalid-edge",
    ],
    [
      "the same connection twice",
      [
        {
          op: "add-edge",
          edge: createEdge({ id: "e9", from: "api", to: "db", kind: "write" }),
        },
      ],
      "invalid-edge",
    ],
    [
      "replication between different kinds",
      [
        {
          op: "add-edge",
          edge: createEdge({
            id: "r1",
            from: "api",
            to: "db",
            kind: "replication",
          }),
        },
      ],
      "invalid-edge",
    ],
    [
      "an edge into a scheduler",
      [
        { op: "add-node", node: createNode("scheduler", { id: "cron" }) },
        {
          op: "add-edge",
          edge: createEdge({
            id: "e9",
            from: "api",
            to: "cron",
            kind: "sync-call",
          }),
        },
      ],
      "invalid-edge",
    ],
    [
      "a lock on something other than a coordination service",
      [
        {
          op: "add-edge",
          edge: createEdge({ id: "e9", from: "api", to: "db", kind: "lock" }),
        },
      ],
      "invalid-edge",
    ],
    [
      "a load edge into a coordination service",
      [
        { op: "add-node", node: createNode("coordination", { id: "zk" }) },
        {
          op: "add-edge",
          edge: createEdge({
            id: "e9",
            from: "api",
            to: "zk",
            kind: "sync-call",
          }),
        },
      ],
      "invalid-edge",
    ],
    [
      "a change feed from something other than a database",
      [
        { op: "add-node", node: createNode("search-index", { id: "search" }) },
        {
          op: "add-edge",
          edge: createEdge({
            id: "e9",
            from: "api",
            to: "search",
            kind: "change-feed",
          }),
        },
      ],
      "invalid-edge",
    ],
    [
      "a mount of something other than a config map or a secret",
      [
        { op: "add-node", node: createNode("k8s-deployment", { id: "app" }) },
        { op: "add-node", node: createNode("hpa", { id: "hpa" }) },
        { op: "add-node", node: createNode("secret", { id: "keys" }) },
        { op: "add-node", node: createNode("alert", { id: "pager" }) },
        {
          op: "add-edge",
          edge: createEdge({
            id: "e9",
            from: "app",
            to: "api",
            kind: "mounts",
          }),
        },
      ],
      "invalid-edge",
    ],
    [
      "a pod autoscaler on something other than a deployment",
      [
        { op: "add-node", node: createNode("k8s-deployment", { id: "app" }) },
        { op: "add-node", node: createNode("hpa", { id: "hpa" }) },
        { op: "add-node", node: createNode("secret", { id: "keys" }) },
        { op: "add-node", node: createNode("alert", { id: "pager" }) },
        {
          op: "add-edge",
          edge: createEdge({
            id: "e9",
            from: "hpa",
            to: "api",
            kind: "scales",
          }),
        },
      ],
      "invalid-edge",
    ],
    [
      "a second pod autoscaler on one deployment",
      [
        { op: "add-node", node: createNode("k8s-deployment", { id: "app" }) },
        { op: "add-node", node: createNode("hpa", { id: "hpa" }) },
        { op: "add-node", node: createNode("secret", { id: "keys" }) },
        { op: "add-node", node: createNode("alert", { id: "pager" }) },
        { op: "add-node", node: createNode("hpa", { id: "hpa2" }) },
        {
          op: "add-edge",
          edge: createEdge({
            id: "e7",
            from: "hpa2",
            to: "app",
            kind: "scales",
          }),
        },
        {
          op: "add-edge",
          edge: createEdge({
            id: "e8",
            from: "hpa",
            to: "app",
            kind: "scales",
          }),
        },
      ],
      "invalid-edge",
    ],
    [
      "an alert watching something that serves no traffic",
      [
        { op: "add-node", node: createNode("k8s-deployment", { id: "app" }) },
        { op: "add-node", node: createNode("hpa", { id: "hpa" }) },
        { op: "add-node", node: createNode("secret", { id: "keys" }) },
        { op: "add-node", node: createNode("alert", { id: "pager" }) },
        {
          op: "add-edge",
          edge: createEdge({
            id: "e9",
            from: "pager",
            to: "keys",
            kind: "watches",
          }),
        },
      ],
      "invalid-edge",
    ],
    [
      "traffic sent through a pod autoscaler",
      [
        { op: "add-node", node: createNode("k8s-deployment", { id: "app" }) },
        { op: "add-node", node: createNode("hpa", { id: "hpa" }) },
        { op: "add-node", node: createNode("secret", { id: "keys" }) },
        { op: "add-node", node: createNode("alert", { id: "pager" }) },
        {
          op: "add-edge",
          edge: createEdge({
            id: "e9",
            from: "api",
            to: "hpa",
            kind: "sync-call",
          }),
        },
      ],
      "invalid-edge",
    ],
    [
      "a pipeline that loops back on itself",
      [
        { op: "add-node", node: createNode("pipeline-stage", { id: "build" }) },
        { op: "add-node", node: createNode("pipeline-stage", { id: "ship" }) },
        {
          op: "add-edge",
          edge: createEdge({
            id: "p1",
            from: "build",
            to: "ship",
            kind: "pipeline-next",
          }),
        },
        {
          op: "add-edge",
          edge: createEdge({
            id: "p2",
            from: "ship",
            to: "build",
            kind: "pipeline-next",
          }),
        },
      ],
      "invalid-edge",
    ],
    [
      "a pipeline step from something that is not a stage",
      [
        { op: "add-node", node: createNode("pipeline-stage", { id: "build" }) },
        { op: "add-node", node: createNode("pipeline-stage", { id: "ship" }) },
        {
          op: "add-edge",
          edge: createEdge({
            id: "p1",
            from: "api",
            to: "build",
            kind: "pipeline-next",
          }),
        },
      ],
      "invalid-edge",
    ],
    [
      "publishing to something that is not a registry",
      [
        { op: "add-node", node: createNode("pipeline-stage", { id: "build" }) },
        { op: "add-node", node: createNode("pipeline-stage", { id: "ship" }) },
        {
          op: "add-edge",
          edge: createEdge({
            id: "p1",
            from: "build",
            to: "ship",
            kind: "publishes",
          }),
        },
      ],
      "invalid-edge",
    ],
    [
      "an edge that closes a load cycle",
      [
        {
          op: "add-edge",
          edge: createEdge({
            id: "e9",
            from: "api",
            to: "lb",
            kind: "sync-call",
          }),
        },
      ],
      "load-cycle",
    ],
    [
      "an edge update that closes a load cycle",
      [
        {
          op: "add-edge",
          edge: createEdge({
            id: "r1",
            from: "replica",
            to: "db",
            kind: "replication",
          }),
        },
        {
          op: "add-edge",
          edge: createEdge({
            id: "e9",
            from: "db",
            to: "replica",
            kind: "read",
          }),
        },
        { op: "update-edge", id: "r1", patch: { kind: "read" } },
      ],
      "load-cycle",
    ],
    [
      "a node with a technology nobody registered",
      [
        {
          op: "add-node",
          node: {
            ...createNode("sql-database", { id: "rds" }),
            technology: { id: "aws-rds-postgres", props: {} },
          },
        },
      ],
      "unknown-technology",
    ],
    [
      "giving a node a technology nobody registered",
      [
        {
          op: "update-node",
          id: "db",
          patch: { technology: { id: "aws-rds-postgres", props: {} } },
        },
      ],
      "unknown-technology",
    ],
    [
      "removing a group that still holds a node",
      [
        { op: "update-node", id: "api", patch: { groupId: "eu" } },
        { op: "remove-group", id: "eu" },
      ],
      "group-not-empty",
    ],
  ])("refuses %s", (_, ops, reason) => {
    expect(rejection(ops).reason).toBe(reason as never);
  });

  test("clears a technology and undoes it", () => {
    expectRoundTrip([
      { op: "update-node", id: "db", patch: { technology: null } },
    ]);
  });

  test("lets replication run against the load, since it carries none", () => {
    apply([
      {
        op: "add-edge",
        edge: createEdge({
          id: "r1",
          from: "replica",
          to: "db",
          kind: "replication",
        }),
      },
      {
        op: "add-edge",
        edge: createEdge({ id: "e9", from: "db", to: "replica", kind: "read" }),
      },
    ]);
  });
});
