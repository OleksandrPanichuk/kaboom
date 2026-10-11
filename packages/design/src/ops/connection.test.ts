import { describe, expect, test } from "bun:test";

import {
  canonicalize,
  createEdge,
  createNode,
  type DesignGraph,
  emptyGraph,
} from "../graph";
import { applyOps } from "./apply";
import { type DesignOp, DesignOpBatchSchema } from "./schema";

const base = (): DesignGraph => ({
  ...emptyGraph(),
  nodes: [
    createNode("service", { id: "api" }),
    createNode("connection-pooler", { id: "pooler" }),
    createNode("sql-database", { id: "db" }),
    createNode("cache", { id: "cache" }),
  ],
  edges: [createEdge({ id: "e1", from: "api", to: "db", kind: "write" })],
});

const apply = (ops: DesignOp[], graph = base()) => {
  const result = applyOps(graph, ops);

  if (!result.ok) throw new Error(`${result.reason}: ${result.message}`);

  return result;
};

const undoes = (ops: DesignOp[], graph = base()) => {
  const { graph: next, inverse } = apply(ops, graph);
  const wire = DesignOpBatchSchema.parse(JSON.parse(JSON.stringify(inverse)));

  expect(canonicalize(apply(wire, next).graph)).toBe(canonicalize(graph));
};

describe("connection pools", () => {
  test("a call into a database or a pooler may carry a pool size", () => {
    const { graph } = apply([
      {
        op: "add-edge",
        edge: createEdge({
          id: "e2",
          from: "api",
          to: "pooler",
          kind: "sync-call",
          connection: { poolSize: 5 },
        }),
      },
      {
        op: "add-edge",
        edge: createEdge({
          id: "e3",
          from: "pooler",
          to: "db",
          kind: "sync-call",
          connection: { poolSize: 20 },
        }),
      },
    ]);

    expect(graph.edges.map((edge) => edge.connection)).toEqual([
      undefined,
      { poolSize: 5 },
      { poolSize: 20 },
    ]);
  });

  test("a pool into anything else is refused", () => {
    const result = applyOps(base(), [
      {
        op: "add-edge",
        edge: createEdge({
          id: "e2",
          from: "api",
          to: "cache",
          kind: "read",
          connection: { poolSize: 5 },
        }),
      },
    ]);

    expect(result.ok).toBe(false);
  });

  test("update-edge sets a pool size and removes it with null, and undo restores each", () => {
    undoes([
      { op: "update-edge", id: "e1", patch: { connection: { poolSize: 3 } } },
    ]);

    const pooled = apply([
      { op: "update-edge", id: "e1", patch: { connection: { poolSize: 3 } } },
    ]).graph;

    undoes(
      [{ op: "update-edge", id: "e1", patch: { connection: null } }],
      pooled,
    );
    expect(
      apply(
        [{ op: "update-edge", id: "e1", patch: { connection: null } }],
        pooled,
      ).graph.edges[0]!.connection,
    ).toBeUndefined();
  });

  test("a connection limit is absent until set, and undo makes it absent again", () => {
    const set: DesignOp[] = [
      {
        op: "update-node",
        id: "db",
        patch: { props: { maxConnections: 300 } },
      },
    ];

    expect("maxConnections" in base().nodes[2]!.props).toBe(false);
    undoes(set);

    const limited = apply(set).graph;
    const cleared = apply(
      [
        {
          op: "update-node",
          id: "db",
          patch: { props: { maxConnections: null } },
        },
      ],
      limited,
    ).graph;

    expect("maxConnections" in cleared.nodes[2]!.props).toBe(false);
  });
});
