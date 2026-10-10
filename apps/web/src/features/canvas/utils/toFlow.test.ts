import { createEdge, createGroup, createNode, emptyGraph } from "@repo/design";
import { describe, expect, test } from "bun:test";

import { toFlow } from "./toFlow";

const graphWith = (ids: string[]) => ({
  ...emptyGraph(),
  nodes: ids.map((id) => createNode("service", { id, label: id })),
});

describe("toFlow", () => {
  test("keeps the saved position of a node", () => {
    const { nodes } = toFlow(graphWith(["api"]), { api: { x: 40, y: 80 } });

    expect(nodes[0]?.position).toEqual({ x: 40, y: 80 });
  });

  test("places nodes without a position on a grid, in order", () => {
    const { nodes } = toFlow(graphWith(["a", "b", "c", "d", "e"]), {
      b: { x: 999, y: 999 },
    });

    expect(nodes.map((node) => node.position)).toEqual([
      { x: 0, y: 0 },
      { x: 999, y: 999 },
      { x: 280, y: 0 },
      { x: 560, y: 0 },
      { x: 840, y: 0 },
    ]);
  });

  test("keeps each region's unplaced nodes together, on rows of their own", () => {
    const graph = {
      ...graphWith(["people", "eu-api", "us-api", "eu-db"]),
      groups: [
        createGroup({ id: "eu", kind: "region", label: "EU" }),
        createGroup({ id: "us", kind: "region", label: "US" }),
      ],
    };
    const placed = {
      ...graph,
      nodes: graph.nodes.map((node) => ({
        ...node,
        groupId: node.id.startsWith("eu-")
          ? "eu"
          : node.id.startsWith("us-")
            ? "us"
            : null,
      })),
    };
    const { nodes } = toFlow(placed, {});
    const at = Object.fromEntries(
      nodes.map((node) => [node.id, node.position]),
    );

    expect(at).toEqual({
      people: { x: 0, y: 0 },
      "eu-api": { x: 0, y: 160 },
      "eu-db": { x: 280, y: 160 },
      "us-api": { x: 0, y: 320 },
    });
  });

  test("maps edges to their endpoints and styles them by kind", () => {
    const graph = {
      ...graphWith(["api", "db"]),
      edges: [
        {
          id: "e1",
          from: "api",
          to: "db",
          kind: "async-message" as const,
          label: "",
          props: { share: 1, fanOut: 1, timeoutMs: 1_000, retries: 0 },
        },
      ],
    };
    const [edge] = toFlow(graph, {}).edges;

    expect(edge).toMatchObject({
      source: "api",
      target: "db",
      animated: true,
      label: undefined,
    });
  });
});

describe("toFlow lint hits", () => {
  test("hands each node the hits that name it", () => {
    const hit = {
      lint: "spof-critical-path",
      severity: "warning" as const,
      message: "api runs a single replica",
      nodeIds: ["api"],
      edgeIds: [],
    };
    const { nodes } = toFlow(graphWith(["api", "db"]), {}, [hit]);

    expect(nodes.map((node) => node.data.hits.length)).toEqual([1, 0]);
  });
});

describe("toFlow parallel edges", () => {
  const edge = (
    id: string,
    from: string,
    to: string,
    kind: "read" | "write",
  ) => ({
    id,
    from,
    to,
    kind,
    label: "",
    props: { share: 1, fanOut: 1, timeoutMs: 1_000, retries: 0 },
  });

  test("gives edges between the same two nodes their own lanes, in either direction", () => {
    const graph = {
      ...graphWith(["api", "db", "cache"]),
      edges: [
        edge("w", "api", "db", "write"),
        edge("r", "api", "db", "read"),
        edge("back", "db", "api", "read"),
        edge("c", "api", "cache", "read"),
      ],
    };
    const lanes = toFlow(graph, {}).edges.map((item) => [
      item.id,
      item.data?.lane,
      item.data?.lanes,
    ]);

    expect(lanes).toEqual([
      ["w", 0, 3],
      ["r", 1, 3],
      ["back", 2, 3],
      ["c", 0, 1],
    ]);
  });
});

describe("toFlow with tables", () => {
  const column = (name: string, primaryKey = false, unique = false) => ({
    id: name,
    name,
    type: "bigint" as const,
    nullable: false,
    primaryKey,
    unique,
  });
  const table = (id: string, columns: Array<ReturnType<typeof column>>) => {
    const node = createNode("table", { id, label: id });

    node.props.columns = columns;

    return node;
  };
  const relation = (
    id: string,
    from: string,
    fromColumn: string,
    to: string,
  ) => ({
    ...createEdge({ id, from, to, kind: "relation" }),
    relation: { fromColumn, toColumn: "id", onDelete: "restrict" as const },
  });
  const graph = () => ({
    ...emptyGraph(),
    nodes: [
      table("users", [column("id", true)]),
      table("posts", [
        column("id", true),
        column("author_id"),
        column("editor_id", false, true),
      ]),
    ],
    edges: [
      relation("author", "posts", "author_id", "users"),
      relation("editor", "posts", "editor_id", "users"),
    ],
  });

  test("draws a table as a table, knowing which of its columns are foreign keys", () => {
    const { nodes } = toFlow(graph(), {});

    expect(nodes.map((node) => [node.type, node.data.foreignKeys])).toEqual([
      ["table-node", []],
      ["table-node", ["author_id", "editor_id"]],
    ]);
  });

  test("joins a relation column to column, with its cardinality, and no lanes", () => {
    const { edges } = toFlow(graph(), {});

    expect(
      edges.map((edge) => [
        edge.sourceHandle,
        edge.targetHandle,
        edge.data?.cardinality,
        edge.data?.lanes,
      ]),
    ).toEqual([
      ["author_id:out:left", "id:in:right", "many-to-one", 1],
      ["editor_id:out:left", "id:in:right", "one-to-one", 1],
    ]);
  });

  test("leaves room under a tall table before the next row", () => {
    const tall = graph();

    tall.nodes.push(
      ...["a", "b", "c"].map((id) => table(id, [column("id", true)])),
    );

    const { nodes } = toFlow(tall, {});

    expect(nodes.at(-1)?.position).toEqual({ x: 0, y: 45 + 3 * 28 + 102 });
  });
});
