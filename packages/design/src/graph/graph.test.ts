import { describe, expect, test } from "bun:test";

import { canonicalize } from "./canonicalize";
import { createEdge, createGroup, createNode, emptyGraph } from "./create";
import { GraphMigrationError, migrateGraph } from "./migrate";
import { DESIGN_GRAPH_SCHEMA_VERSION, type DesignGraph } from "./schema";

const sample = (): DesignGraph => ({
  ...emptyGraph(),
  groups: [createGroup({ id: "eu", kind: "region", label: "EU" })],
  nodes: [
    createNode("client", { id: "users" }),
    createNode("service", { id: "api", groupId: "eu" }),
  ],
  edges: [
    createEdge({ id: "e1", from: "users", to: "api", kind: "sync-call" }),
  ],
});

describe("createNode", () => {
  test("fills every prop with the kind's default", () => {
    expect(createNode("sql-database", { id: "db" })).toEqual({
      id: "db",
      kind: "sql-database",
      label: "SQL database",
      groupId: null,
      notes: "",
      props: {
        readCapacityRps: 5_000,
        writeCapacityRps: 1_000,
        storageGb: 500,
        recordSizeKb: 1,
        baseLatencyMs: 5,
        failover: "none",
        shards: 1,
        shardKey: "",
      },
    });
  });
});

describe("migrateGraph", () => {
  test("accepts a graph at the current version", () => {
    expect(migrateGraph(sample())).toEqual(sample());
  });

  test("fills defaults a stored graph left out", () => {
    const stored = {
      schemaVersion: DESIGN_GRAPH_SCHEMA_VERSION,
      nodes: [{ id: "api", kind: "service", label: "API" }],
      edges: [],
      groups: [],
    };

    expect(migrateGraph(stored).nodes[0]).toEqual(
      createNode("service", { id: "api", label: "API" }),
    );
  });

  test("steps an old graph through every migration in order", () => {
    const seen: number[] = [];

    const migrated = migrateGraph(
      { schemaVersion: -1, nodes: [], edges: [] },
      {
        [-1]: (graph) => {
          seen.push(-1);

          return graph;
        },
        [0]: (graph) => {
          seen.push(0);

          return { ...graph, groups: [] };
        },
      },
    );

    expect(seen).toEqual([-1, 0]);
    expect(migrated).toEqual(emptyGraph());
  });

  test.each([
    ["no version", { nodes: [] }],
    [
      "a newer version",
      { ...emptyGraph(), schemaVersion: DESIGN_GRAPH_SCHEMA_VERSION + 1 },
    ],
    ["a missing migration", { ...emptyGraph(), schemaVersion: 0 }],
    [
      "an unknown node kind",
      { ...emptyGraph(), nodes: [{ id: "x", kind: "mainframe", label: "" }] },
    ],
    ["not an object", [emptyGraph()]],
  ])("refuses %s", (_, raw) => {
    expect(() => migrateGraph(raw)).toThrow(GraphMigrationError);
  });
});

describe("canonicalize", () => {
  test("ignores the order of entities and of keys", () => {
    const graph = sample();
    const shuffled: DesignGraph = {
      groups: graph.groups,
      edges: graph.edges,
      nodes: [...graph.nodes].reverse().map((node) => ({
        props: node.props,
        notes: node.notes,
        groupId: node.groupId,
        label: node.label,
        kind: node.kind,
        id: node.id,
      })) as DesignGraph["nodes"],
      schemaVersion: graph.schemaVersion,
    };

    expect(canonicalize(shuffled)).toBe(canonicalize(graph));
  });

  test("changes when anything that matters changes", () => {
    const graph = sample();
    const renamed = structuredClone(graph);

    renamed.nodes[0]!.label = "Browsers";

    expect(canonicalize(renamed)).not.toBe(canonicalize(graph));
  });
});
