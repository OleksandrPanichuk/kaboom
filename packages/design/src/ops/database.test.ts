import { describe, expect, test } from "bun:test";

import { column, references, table } from "../data-model/fixtures";
import {
  canonicalize,
  createGroup,
  createNode,
  type DesignGraph,
  emptyGraph,
} from "../graph";
import { applyOps } from "./apply";
import type { DesignOp } from "./schema";

const shop = createGroup({
  id: "shop",
  kind: "database",
  label: "Shop",
  engine: "mysql",
});

const apply = (ops: DesignOp[], graph: DesignGraph = emptyGraph()) => {
  const result = applyOps(graph, ops);

  if (!result.ok) throw new Error(`${result.reason}: ${result.message}`);

  return result;
};

const refusal = (ops: DesignOp[], graph: DesignGraph = emptyGraph()) => {
  const result = applyOps(graph, ops);

  if (result.ok) throw new Error("expected a refusal");

  return result.message;
};

const orders = {
  ...table("orders", [column("id", "bigint", { primaryKey: true })]),
  groupId: "shop",
};

describe("databases", () => {
  test("hold the tables of their engine, and undo", () => {
    const { graph, inverse } = apply([
      { op: "add-group", group: shop },
      { op: "add-node", node: orders },
    ]);

    expect(graph.nodes[0]?.groupId).toBe("shop");
    expect(canonicalize(apply(inverse, graph).graph)).toBe(
      canonicalize(emptyGraph()),
    );
  });

  test("refuse anything a database does not hold, and a database in the wrong place", () => {
    expect(
      refusal([
        { op: "add-group", group: shop },
        {
          op: "add-node",
          node: { ...createNode("service", { id: "api" }), groupId: "shop" },
        },
      ]),
    ).toBe("Service is a service; a MySQL database holds tables");
    expect(
      refusal([
        {
          op: "add-group",
          group: createGroup({ id: "net", kind: "vpc", label: "Net" }),
        },
        { op: "add-group", group: { ...shop, parentId: "net" } },
      ]),
    ).toContain("a database sits in a region or on its own");
    expect(
      refusal([{ op: "add-group", group: { ...shop, engine: undefined } }]),
    ).toBe("Database shop names no engine");
    expect(
      refusal([
        {
          op: "add-group",
          group: {
            ...createGroup({ id: "eu", kind: "region", label: "EU" }),
            engine: "mysql",
          },
        },
      ]),
    ).toBe("Group eu is a region; only a database has an engine");
  });

  test("change engine within SQL, and undo, but never to another kind of database", () => {
    const { graph } = apply([
      { op: "add-group", group: shop },
      { op: "add-node", node: orders },
    ]);
    const moved = apply(
      [{ op: "update-group", id: "shop", patch: { engine: "postgres" } }],
      graph,
    );

    expect(moved.graph.groups[0]?.engine).toBe("postgres");
    expect(apply(moved.inverse, moved.graph).graph.groups[0]?.engine).toBe(
      "mysql",
    );
    expect(
      refusal(
        [{ op: "update-group", id: "shop", patch: { engine: "mongodb" } }],
        graph,
      ),
    ).toBe(
      "Shop is a MySQL database; it can change only to another engine of its kind",
    );
  });
});

describe("composite foreign keys", () => {
  const graph = (): DesignGraph => ({
    ...emptyGraph(),
    nodes: [
      table("prices", [
        column("product_id", "bigint", { primaryKey: true }),
        column("region", "text", { primaryKey: true }),
      ]),
      table("lines", [
        column("id", "bigint", { primaryKey: true }),
        column("product_id", "bigint"),
        column("region", "text"),
      ]),
    ],
    edges: [],
  });
  const composite = (
    more: Array<{ fromColumn: string; toColumn: string }>,
  ): DesignOp => ({
    op: "add-edge",
    edge: {
      ...references("lines", "product_id", "prices", "product_id"),
      relation: {
        fromColumn: "product_id",
        toColumn: "product_id",
        onDelete: "restrict",
        ...(more.length > 0 ? { moreColumns: more } : {}),
      },
    },
  });

  test("reference every column of a composite primary key", () => {
    expect(
      apply(
        [composite([{ fromColumn: "region", toColumn: "region" }])],
        graph(),
      ).graph.edges[0]?.relation?.moreColumns,
    ).toEqual([{ fromColumn: "region", toColumn: "region" }]);
  });

  test("refuse part of a composite key, or a column named twice", () => {
    expect(refusal([composite([])], graph())).toBe(
      "prices.product_id is neither the primary key of prices nor unique, so a foreign key cannot reference it",
    );
    expect(
      refusal(
        [composite([{ fromColumn: "product_id", toColumn: "region" }])],
        graph(),
      ),
    ).toContain("names a column twice");
  });
});

describe("a database stored on a node", () => {
  const primary = createNode("sql-database", { id: "primary" });
  const documents = createNode("nosql-database", { id: "documents" });
  const placed = apply([
    { op: "add-node", node: primary },
    { op: "add-node", node: documents },
    { op: "add-group", group: shop },
  ]).graph;

  test("names a node of its family, and undo takes the link away", () => {
    const { graph, inverse } = apply(
      [{ op: "update-group", id: "shop", patch: { storedOn: "primary" } }],
      placed,
    );

    expect(graph.groups[0]?.storedOn).toBe("primary");
    expect(canonicalize(apply(inverse, graph).graph)).toBe(
      canonicalize(placed),
    );
  });

  test("refuses a node of the wrong kind, a missing one, and a group that is no database", () => {
    expect(
      refusal(
        [{ op: "update-group", id: "shop", patch: { storedOn: "documents" } }],
        placed,
      ),
    ).toContain("lives on a sql database");
    expect(
      refusal(
        [{ op: "update-group", id: "shop", patch: { storedOn: "ghost" } }],
        placed,
      ),
    ).toContain("does not have");
    expect(
      refusal([
        { op: "add-node", node: primary },
        {
          op: "add-group",
          group: {
            ...createGroup({ id: "eu", kind: "region", label: "EU" }),
            storedOn: "primary",
          },
        },
      ]),
    ).toContain("only a database");
  });

  test("loses the link when the node goes, and undo brings both back", () => {
    const stored = apply(
      [{ op: "update-group", id: "shop", patch: { storedOn: "primary" } }],
      placed,
    ).graph;
    const { graph, inverse } = apply(
      [{ op: "remove-node", id: "primary" }],
      stored,
    );

    expect(graph.groups[0]?.storedOn).toBeUndefined();
    expect(canonicalize(apply(inverse, graph).graph)).toBe(
      canonicalize(stored),
    );
  });

  test("keeps the link through a change of engine within its family", () => {
    const stored = apply(
      [{ op: "update-group", id: "shop", patch: { storedOn: "primary" } }],
      placed,
    ).graph;

    expect(
      apply(
        [{ op: "update-group", id: "shop", patch: { engine: "postgres" } }],
        stored,
      ).graph.groups[0]?.storedOn,
    ).toBe("primary");
  });
});
