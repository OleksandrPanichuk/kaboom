import { describe, expect, test } from "bun:test";

import type { Column } from "../catalogue";
import {
  canonicalize,
  createEdge,
  createNode,
  type DesignGraph,
  emptyGraph,
} from "../graph";
import { applyOps } from "./apply";
import type { DesignOp } from "./schema";

const column = (
  id: string,
  type: Column["type"],
  flags: Partial<Pick<Column, "nullable" | "primaryKey" | "unique">> = {},
): Column => ({
  id,
  name: id,
  type,
  nullable: false,
  primaryKey: false,
  unique: false,
  ...flags,
});

const table = (id: string, columns: Column[]) => {
  const node = createNode("table", { id, label: id });

  node.props.columns = columns;

  return node;
};

const base = (): DesignGraph => ({
  ...emptyGraph(),
  nodes: [
    table("users", [
      column("id", "bigint", { primaryKey: true }),
      column("email", "text", { unique: true }),
      column("name", "text"),
      column("manager_id", "bigint", { nullable: true }),
    ]),
    table("posts", [
      column("post_id", "bigint", { primaryKey: true }),
      column("author_id", "bigint"),
      column("editor_id", "bigint", { nullable: true }),
    ]),
    createNode("service", { id: "api" }),
  ],
  edges: [],
});

const relation = (
  id: string,
  from: string,
  fromColumn: string,
  to: string,
  toColumn: string,
): DesignOp => ({
  op: "add-edge",
  edge: createEdge({
    id,
    from,
    to,
    kind: "relation",
    relation: { fromColumn, toColumn, onDelete: "restrict" },
  }),
});

const apply = (ops: DesignOp[], graph = base()) => {
  const result = applyOps(graph, ops);

  if (!result.ok) throw new Error(`${result.reason}: ${result.message}`);

  return result;
};

const refusal = (ops: DesignOp[], graph = base()) => {
  const result = applyOps(graph, ops);

  if (result.ok) throw new Error("expected a refusal");

  return result.message;
};

describe("relations", () => {
  test("join a foreign key to the primary key it references, and undo", () => {
    const { graph, inverse } = apply([
      relation("r1", "posts", "author_id", "users", "id"),
    ]);
    const back = apply(inverse, graph);

    expect(graph.edges[0]?.relation).toEqual({
      fromColumn: "author_id",
      toColumn: "id",
      onDelete: "restrict",
    });
    expect(canonicalize(back.graph)).toBe(canonicalize(base()));
  });

  test("may reference a unique column, the same table, or one table twice", () => {
    const { graph } = apply([
      relation("r1", "posts", "author_id", "users", "id"),
      relation("r2", "posts", "editor_id", "users", "id"),
      relation("r3", "users", "manager_id", "users", "id"),
    ]);

    expect(graph.edges.map((edge) => edge.id)).toEqual(["r1", "r2", "r3"]);
  });

  test("refuse anything but two tables, and a relation without columns", () => {
    expect(
      refusal([relation("r1", "api", "author_id", "users", "id")]),
    ).toContain("A relation joins two tables, and Service is a service");
    expect(
      refusal([
        {
          op: "add-edge",
          edge: createEdge({
            id: "r1",
            from: "posts",
            to: "users",
            kind: "relation",
          }),
        },
      ]),
    ).toContain("names no columns");
  });

  test("refuse a column the table does not have, or a reference that is not a key", () => {
    expect(
      refusal([relation("r1", "posts", "missing", "users", "id")]),
    ).toContain("does not have");
    expect(
      refusal([relation("r1", "posts", "author_id", "users", "name")]),
    ).toContain("is neither the primary key of users nor unique");
  });

  test("refuse a second foreign key on one column, and a column referencing itself", () => {
    expect(
      refusal([
        relation("r1", "posts", "author_id", "users", "id"),
        relation("r2", "posts", "author_id", "users", "email"),
      ]),
    ).toContain("already references a table");
    expect(refusal([relation("r1", "users", "id", "users", "id")])).toContain(
      "reference itself",
    );
  });

  test("refuse a column on any edge but a relation", () => {
    expect(
      refusal([
        {
          op: "add-edge",
          edge: createEdge({
            id: "e1",
            from: "posts",
            to: "users",
            kind: "sync-call",
            relation: {
              fromColumn: "author_id",
              toColumn: "id",
              onDelete: "restrict",
            },
          }),
        },
      ]),
    ).toContain("only a relation joins columns");
  });

  test("refuse removing a column a relation uses, until the relation goes first", () => {
    const { graph } = apply([
      relation("r1", "posts", "author_id", "users", "id"),
    ]);
    const without = {
      op: "update-node",
      id: "users",
      patch: {
        props: {
          columns: [column("uid", "bigint", { primaryKey: true })],
        },
      },
    } satisfies DesignOp;

    expect(refusal([without], graph)).toContain("does not have");
    expect(
      apply([{ op: "remove-edge", id: "r1" }, without], graph).graph.edges,
    ).toEqual([]);
  });

  test("change what a delete does, and nothing else of the relation", () => {
    const { graph } = apply([
      relation("r1", "posts", "author_id", "users", "id"),
    ]);
    const changed = apply(
      [
        {
          op: "update-edge",
          id: "r1",
          patch: { relation: { onDelete: "cascade" } },
        },
      ],
      graph,
    );
    const back = apply(changed.inverse, changed.graph);

    expect(changed.graph.edges[0]?.relation?.onDelete).toBe("cascade");
    expect(back.graph.edges[0]?.relation?.onDelete).toBe("restrict");
    expect(
      refusal(
        [{ op: "update-edge", id: "r1", patch: { kind: "sync-call" } }],
        graph,
      ),
    ).toContain("only a relation joins columns");
  });

  test("keep a table's columns and indexes consistent", () => {
    const patch = (props: Record<string, unknown>): DesignOp => ({
      op: "update-node",
      id: "users",
      patch: { props },
    });

    expect(
      refusal([
        patch({
          columns: [column("a", "text"), { ...column("b", "text"), name: "A" }],
        }),
      ]),
    ).toContain("repeats column A");
    expect(
      refusal([
        patch({
          columns: [column("a", "text", { primaryKey: true, nullable: true })],
        }),
      ]),
    ).toContain("cannot be null");
    expect(
      refusal([
        patch({ indexes: [{ id: "i1", columns: ["nope"], unique: false }] }),
      ]),
    ).toContain("names no column nope");
  });
});
