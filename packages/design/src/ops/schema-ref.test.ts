import { describe, expect, test } from "bun:test";

import {
  canonicalize,
  createNode,
  type DesignGraph,
  DesignGraphSchema,
  emptyGraph,
} from "../graph";
import { applyOps } from "./apply";
import { type DesignOp, DesignOpBatchSchema } from "./schema";
import { schemaRefusal } from "./validate/schemas";

const SCHEMA = "1f0c2a9e-7b3d-4c11-9a2e-5d6f7a8b9c0d";

const system = (): DesignGraph => ({
  ...emptyGraph(),
  nodes: [
    createNode("service", { id: "api" }),
    createNode("sql-database", { id: "db" }),
    createNode("nosql-database", { id: "docs" }),
  ],
});

const apply = (
  ops: DesignOp[],
  graph = system(),
  document: "system" | "schema" = "system",
) => {
  const result = applyOps(graph, ops, { document });

  if (!result.ok) throw new Error(`${result.reason}: ${result.message}`);

  return result;
};

const refusal = (
  ops: DesignOp[],
  graph = system(),
  document: "system" | "schema" = "system",
) => {
  const result = applyOps(graph, ops, { document });

  return result.ok ? null : result.message;
};

const schemaOf = (engine: "postgres" | "mongodb" | null): DesignGraph => ({
  ...emptyGraph(),
  groups:
    engine === null
      ? []
      : [
          {
            id: "store",
            kind: "database",
            label: "Store",
            parentId: null,
            engine,
          },
        ],
  nodes: [
    engine === "mongodb"
      ? createNode("collection", { id: "orders", groupId: "store" })
      : createNode("table", {
          id: "orders",
          groupId: engine === null ? null : "store",
        }),
  ],
});

describe("a database naming its schema", () => {
  test("is set on a SQL or NoSQL database, and undone to nothing", () => {
    const ops: DesignOp[] = [
      { op: "update-node", id: "db", patch: { schema: { designId: SCHEMA } } },
    ];
    const { graph, inverse } = apply(ops);
    const wire = DesignOpBatchSchema.parse(JSON.parse(JSON.stringify(inverse)));

    expect(graph.nodes.find((node) => node.id === "db")?.schema).toEqual({
      designId: SCHEMA,
    });
    expect(canonicalize(apply(wire, graph).graph)).toBe(canonicalize(system()));
  });

  test("is removed with null", () => {
    const { graph } = apply([
      {
        op: "update-node",
        id: "docs",
        patch: { schema: { designId: SCHEMA } },
      },
      { op: "update-node", id: "docs", patch: { schema: null } },
    ]);

    expect("schema" in graph.nodes.find((node) => node.id === "docs")!).toBe(
      false,
    );
  });

  test("is refused on anything but a database", () => {
    expect(
      refusal([
        {
          op: "update-node",
          id: "api",
          patch: { schema: { designId: SCHEMA } },
        },
      ]),
    ).toContain("only a SQL or NoSQL database names a schema");
    expect(
      refusal([
        {
          op: "add-node",
          node: {
            ...createNode("cache", { id: "c" }),
            schema: { designId: SCHEMA },
          },
        },
      ]),
    ).toContain("only a SQL or NoSQL database");
  });

  test("leaves a graph without one parsing as it always did", () => {
    const parsed = DesignGraphSchema.parse(system());

    expect(parsed.nodes.every((node) => !("schema" in node))).toBe(true);
  });
});

describe("a schema design", () => {
  test("holds databases and data kinds only", () => {
    const ok = apply(
      [
        {
          op: "add-group",
          group: {
            id: "pg",
            kind: "database",
            label: "Main",
            parentId: null,
            engine: "postgres",
          },
        },
        {
          op: "add-node",
          node: createNode("table", { id: "users", groupId: "pg" }),
        },
      ],
      emptyGraph(),
      "schema",
    );

    expect(ok.graph.nodes).toHaveLength(1);
    expect(
      refusal(
        [{ op: "add-node", node: createNode("service", { id: "api" }) }],
        emptyGraph(),
        "schema",
      ),
    ).toContain("draw it in a system");
    expect(
      refusal(
        [
          {
            op: "add-group",
            group: { id: "eu", kind: "region", label: "EU", parentId: null },
          },
        ],
        emptyGraph(),
        "schema",
      ),
    ).toContain("not a region");
  });

  test("fits a database of its own family only", () => {
    expect(schemaRefusal("sql-database", schemaOf("postgres"))).toBeNull();
    expect(schemaRefusal("sql-database", schemaOf(null))).toBeNull();
    expect(schemaRefusal("nosql-database", schemaOf("mongodb"))).toBeNull();
    expect(schemaRefusal("sql-database", schemaOf("mongodb"))).toContain(
      "document",
    );
    expect(schemaRefusal("nosql-database", schemaOf("postgres"))).toContain(
      "sql",
    );
    expect(schemaRefusal("service", schemaOf("postgres"))).toContain(
      "does not hold a schema",
    );
  });
});
