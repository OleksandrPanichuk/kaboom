import { describe, expect, test } from "bun:test";

import { type EdgeKind, EdgePropsSchema, type NodeKind } from "../catalogue";
import {
  createNode,
  type DesignGraph,
  type DesignNode,
  emptyGraph,
} from "../graph";
import { LINT_IDS, runLints } from "./lints";

type Patch = Partial<DesignNode["props"]>;

const node = (
  id: string,
  kind: NodeKind,
  props: Record<string, unknown> = {},
) => {
  const created = createNode(kind, { id, label: id });

  return {
    ...created,
    props: { ...created.props, ...(props as Patch) },
  } as DesignNode;
};

const edge = (from: string, to: string, kind: EdgeKind = "sync-call") => ({
  id: `${from}-${to}`,
  from,
  to,
  kind,
  label: "",
  props: EdgePropsSchema.parse({}),
});

const graph = (
  nodes: DesignNode[],
  edges: Array<ReturnType<typeof edge>> = [],
): DesignGraph => ({ ...emptyGraph(), nodes, edges });

const hits = (g: DesignGraph, lint: string) =>
  runLints(g)
    .filter((hit) => hit.lint === lint)
    .map((hit) => hit.nodeIds.join("+"));

const healthy = graph(
  [
    node("users", "client"),
    node("lb", "load-balancer"),
    node("api", "service", { replicas: 3 }),
    node("db", "sql-database"),
    node("replica", "sql-database"),
    node("events", "queue"),
    node("worker", "worker", { replicas: 2 }),
  ],
  [
    edge("users", "lb"),
    edge("lb", "api"),
    edge("api", "db", "write"),
    edge("db", "replica", "replication"),
    edge("api", "events", "async-message"),
    edge("events", "worker", "async-message"),
  ],
);

describe("lints", () => {
  test("a sound design has nothing to say", () => {
    expect(runLints(healthy)).toEqual([]);
  });

  test("every lint in the registry carries its own id and severity", () => {
    const g = graph([node("users", "client"), node("lonely", "service")]);

    for (const hit of runLints(g)) {
      expect(LINT_IDS).toContain(hit.lint as never);
      expect(["warning", "info"]).toContain(hit.severity);
    }
  });

  describe("spof-critical-path", () => {
    test("flags a single replica on the request path", () => {
      const g = graph(
        [node("users", "client"), node("api", "service", { replicas: 1 })],
        [edge("users", "api")],
      );

      expect(hits(g, "spof-critical-path")).toEqual(["api"]);
    });

    test("accepts a single replica that autoscales to two or more", () => {
      const g = graph(
        [
          node("users", "client"),
          node("api", "service", {
            replicas: 1,
            autoscale: {
              enabled: true,
              min: 2,
              max: 10,
              targetUtilisation: 0.7,
            },
          }),
        ],
        [edge("users", "api")],
      );

      expect(hits(g, "spof-critical-path")).toEqual([]);
    });

    test("flags a SQL database without a replica, and not once it has one", () => {
      const lone = graph(
        [node("users", "client"), node("db", "sql-database")],
        [edge("users", "db", "write")],
      );

      expect(hits(lone, "spof-critical-path")).toEqual(["db"]);
      expect(hits(healthy, "spof-critical-path")).toEqual([]);
    });

    test("flags a NoSQL database that keeps one copy", () => {
      const g = graph(
        [
          node("users", "client"),
          node("kv", "nosql-database", { replicationFactor: 1 }),
          node("kv3", "nosql-database", { replicationFactor: 3 }),
        ],
        [edge("users", "kv", "write"), edge("users", "kv3", "write")],
      );

      expect(hits(g, "spof-critical-path")).toEqual(["kv"]);
    });

    test("ignores what no client reaches, and looks everywhere when there is no client", () => {
      const offPath = graph([
        node("users", "client"),
        node("api", "service", { replicas: 1 }),
      ]);
      const noClient = graph([node("api", "service", { replicas: 1 })]);

      expect(hits(offPath, "spof-critical-path")).toEqual([]);
      expect(hits(noClient, "spof-critical-path")).toEqual(["api"]);
    });
  });

  describe("unreachable-node", () => {
    test("flags a node no client leads to, following replication too", () => {
      const g = graph(
        [...healthy.nodes, node("orphan", "cache")],
        healthy.edges,
      );

      expect(hits(g, "unreachable-node")).toEqual(["orphan"]);
    });

    test("stays quiet until the design has a client", () => {
      expect(hits(graph([node("api", "service")]), "unreachable-node")).toEqual(
        [],
      );
    });
  });

  describe("dead-end-node", () => {
    test("flags a client, CDN, balancer or queue that sends nowhere", () => {
      const g = graph([
        node("users", "client"),
        node("cdn", "cdn"),
        node("lb", "load-balancer"),
        node("q", "queue"),
        node("api", "service", { replicas: 2 }),
      ]);

      expect(hits(g, "dead-end-node")).toEqual(["users", "cdn", "lb", "q"]);
    });

    test("does not count replication as somewhere to send", () => {
      const g = graph(
        [node("lb", "load-balancer"), node("lb2", "load-balancer")],
        [edge("lb", "lb2", "replication")],
      );

      expect(hits(g, "dead-end-node")).toEqual(["lb", "lb2"]);
    });
  });

  describe("stateful-behind-round-robin", () => {
    const behind = (algorithm: string, stateless: boolean) =>
      graph(
        [
          node("users", "client"),
          node("lb", "load-balancer", { algorithm }),
          node("api", "service", { replicas: 3, stateless }),
        ],
        [edge("users", "lb"), edge("lb", "api")],
      );

    test("flags a stateful service behind round-robin or least connections", () => {
      expect(
        hits(behind("round-robin", false), "stateful-behind-round-robin"),
      ).toEqual(["lb+api"]);
      expect(
        hits(behind("least-connections", false), "stateful-behind-round-robin"),
      ).toEqual(["lb+api"]);
    });

    test("accepts ip-hash, or a stateless service", () => {
      expect(
        hits(behind("ip-hash", false), "stateful-behind-round-robin"),
      ).toEqual([]);
      expect(
        hits(behind("round-robin", true), "stateful-behind-round-robin"),
      ).toEqual([]);
    });

    test("points at the edge between them", () => {
      const [hit] = runLints(behind("round-robin", false)).filter(
        (item) => item.lint === "stateful-behind-round-robin",
      );

      expect(hit?.edgeIds).toEqual(["lb-api"]);
    });
  });
});
