import { describe, expect, test } from "bun:test";

import { evaluateLoad } from "../evaluate/load";
import { createEdge, createNode, emptyGraph } from "../graph";
import { applyOps } from "../ops";
import { catalogue, isNodeKind } from "./catalogue";
import { findTechnology, technologies, technologiesFor } from "./technologies";

describe("technologies", () => {
  test("keys every technology by its id and ties it to a known kind", () => {
    for (const [key, technology] of Object.entries(technologies)) {
      expect(technology.id).toBe(key);
      expect(isNodeKind(technology.kind)).toBe(true);
      expect(() => technology.props.parse({})).not.toThrow();
    }
  });

  test("finds nothing for an unknown id or an inherited key", () => {
    expect(findTechnology("aws-rds-postgres", "sql-database")).toBeUndefined();
    expect(findTechnology("toString", "sql-database")).toBeUndefined();
  });
});

describe("the technology catalogue", () => {
  test("derives valid props for its kind from every product's defaults", () => {
    const all = Object.values(technologies);

    expect(all.length).toBeGreaterThanOrEqual(20);

    for (const technology of all) {
      const derived = technology.derive(technology.props.parse({}));
      const kind = catalogue[technology.kind];

      expect(technology.label.length).toBeGreaterThan(0);
      expect(technology.summary.length).toBeGreaterThan(0);
      expect(Object.keys(derived).length).toBeGreaterThan(0);
      expect(() => kind.props.parse(derived)).not.toThrow();
    }
  });

  test("offers products for the kinds people pick them for", () => {
    for (const kind of [
      "queue",
      "stream",
      "sql-database",
      "nosql-database",
      "cache",
      "object-storage",
      "cdn",
      "load-balancer",
    ] as const) {
      expect(technologiesFor(kind).length).toBeGreaterThan(0);
    }
  });
});

describe("a node with a technology", () => {
  const rds = (props: Record<string, unknown>) => ({
    ...createNode("sql-database", { id: "db" }),
    technology: { id: "amazon-rds", props },
  });

  test("takes its kind's props from the product when it is added", () => {
    const result = applyOps(emptyGraph(), [
      { op: "add-node", node: rds({ instanceClass: "db.r6g.2xlarge" }) },
    ]);

    expect(result.ok && result.graph.nodes[0]!.props).toMatchObject({
      readCapacityRps: 12_000,
      writeCapacityRps: 3_000,
      failover: "automatic",
    });
  });

  test("follows a change to the product, keeps the product's say over its props, and undoes both", () => {
    const added = applyOps(emptyGraph(), [{ op: "add-node", node: rds({}) }]);

    if (!added.ok) throw new Error(added.message);

    const changed = applyOps(added.graph, [
      {
        op: "update-node",
        id: "db",
        patch: {
          technology: { id: "amazon-rds", props: { multiAz: false } },
          props: { readCapacityRps: 99_999, storageGb: 900 },
        },
      },
    ]);

    if (!changed.ok) throw new Error(changed.message);

    expect(changed.graph.nodes[0]!.props).toMatchObject({
      failover: "manual",
      readCapacityRps: 4_000,
      storageGb: 900,
    });

    const undone = applyOps(changed.graph, changed.inverse);

    expect(undone.ok && undone.graph.nodes[0]).toEqual(added.graph.nodes[0]);
  });
});

describe("a product in the simulation", () => {
  test("a FIFO queue without batching refuses what a standard one takes", () => {
    const client = createNode("client", { id: "users" });
    const api = createNode("service", { id: "api" });
    const design = (type: "standard" | "fifo") => {
      const result = applyOps(emptyGraph(), [
        {
          op: "add-node",
          node: {
            ...client,
            props: { ...client.props, rps: 1_000, readRatio: 0 },
          },
        },
        {
          op: "add-node",
          node: { ...api, props: { ...api.props, replicas: 10 } },
        },
        {
          op: "add-node",
          node: {
            ...createNode("queue", { id: "jobs" }),
            technology: {
              id: "amazon-sqs",
              props: { type, batching: false },
            },
          },
        },
        {
          op: "add-edge",
          edge: createEdge({
            id: "e1",
            from: "users",
            to: "api",
            kind: "sync-call",
          }),
        },
        {
          op: "add-edge",
          edge: createEdge({
            id: "e2",
            from: "api",
            to: "jobs",
            kind: "async-message",
          }),
        },
      ]);

      if (!result.ok) throw new Error(result.message);

      return evaluateLoad(result.graph, { kind: "load", durationSeconds: 60 });
    };
    const kinds = (type: "standard" | "fifo") =>
      design(type).findings.map((finding) => finding.kind);

    expect(kinds("fifo")).toContain("errors");
    expect(kinds("standard")).not.toContain("errors");
  });
});
