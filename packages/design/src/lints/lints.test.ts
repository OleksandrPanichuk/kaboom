import { describe, expect, test } from "bun:test";

import { type EdgeKind, EdgePropsSchema, type NodeKind } from "../catalogue";
import {
  createGroup,
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

    test("flags a one-pod deployment unless its pod autoscaler keeps two", () => {
      const nodes = [
        node("users", "client"),
        node("web", "k8s-service"),
        node("app", "k8s-deployment", { replicas: 1 }),
      ];
      const edges = [edge("users", "web"), edge("web", "app")];
      const scaled = graph(
        [...nodes, node("hpa", "hpa", { min: 2 })],
        [...edges, edge("hpa", "app", "scales")],
      );

      expect(hits(graph(nodes, edges), "spof-critical-path")).toEqual(["app"]);
      expect(hits(scaled, "spof-critical-path")).toEqual([]);
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

    test("flags a stream that keeps one copy of each partition", () => {
      const g = graph(
        [
          node("users", "client"),
          node("log", "stream", { replicationFactor: 1 }),
          node("log3", "stream"),
          node("w", "worker", { replicas: 2 }),
        ],
        [
          edge("users", "log", "async-message"),
          edge("users", "log3", "async-message"),
          edge("log", "w", "async-message"),
          edge("log3", "w", "async-message"),
        ],
      );

      expect(hits(g, "spof-critical-path")).toEqual(["log"]);
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

    test("leaves out what serves no traffic, such as an autoscaler or a secret", () => {
      const g = graph(
        [
          node("users", "client"),
          node("app", "k8s-deployment"),
          node("hpa", "hpa"),
          node("keys", "secret"),
          node("pager", "alert"),
        ],
        [
          edge("users", "app"),
          edge("hpa", "app", "scales"),
          edge("app", "keys", "mounts"),
          edge("pager", "app", "watches"),
        ],
      );

      expect(hits(g, "unreachable-node")).toEqual([]);
    });

    test("stays quiet until the design has a client", () => {
      expect(hits(graph([node("api", "service")]), "unreachable-node")).toEqual(
        [],
      );
    });
  });

  describe("dead-end-node", () => {
    test("flags a client, CDN, balancer, queue or stream that sends nowhere", () => {
      const g = graph([
        node("users", "client"),
        node("cdn", "cdn"),
        node("lb", "load-balancer"),
        node("q", "queue"),
        node("log", "stream"),
        node("api", "service", { replicas: 2 }),
      ]);

      expect(hits(g, "dead-end-node")).toEqual([
        "users",
        "cdn",
        "lb",
        "q",
        "log",
      ]);
    });

    test("does not count replication as somewhere to send", () => {
      const g = graph(
        [node("lb", "load-balancer"), node("lb2", "load-balancer")],
        [edge("lb", "lb2", "replication")],
      );

      expect(hits(g, "dead-end-node")).toEqual(["lb", "lb2"]);
    });

    test("flags an ingress or a Kubernetes service that leads nowhere", () => {
      const g = graph(
        [
          node("edge", "ingress"),
          node("web", "k8s-service"),
          node("app", "k8s-deployment"),
          node("keys", "secret"),
        ],
        [edge("app", "keys", "mounts")],
      );

      expect(hits(g, "dead-end-node")).toEqual(["edge", "web"]);
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
  describe("sync-third-party", () => {
    const pay = (kind: EdgeKind) =>
      graph(
        [
          node("users", "client"),
          node("api", "service", { replicas: 2 }),
          node("jobs", "queue"),
          node("worker", "worker", { replicas: 2 }),
          node("payments", "external-api"),
        ],
        kind === "async-message"
          ? [
              edge("users", "api"),
              edge("api", "jobs", "async-message"),
              edge("jobs", "worker", "async-message"),
              edge("worker", "payments"),
            ]
          : [edge("users", "api"), edge("api", "payments", kind)],
      );

    test("flags a third party the user waits on", () => {
      expect(hits(pay("sync-call"), "sync-third-party")).toEqual([
        "api+payments",
      ]);
      expect(hits(pay("write"), "sync-third-party")).toEqual(["api+payments"]);
    });

    test("accepts one called by a worker behind a queue", () => {
      expect(hits(pay("async-message"), "sync-third-party")).toEqual([]);
    });
  });
  describe("duplicate-schedule", () => {
    const cron = (replicas: number, locked: boolean) =>
      graph(
        [
          node("cron", "scheduler", { replicas }),
          node("jobs", "queue"),
          node("worker", "worker", { replicas: 2 }),
          node("zk", "coordination"),
        ],
        [
          edge("cron", "jobs", "async-message"),
          edge("jobs", "worker", "async-message"),
          ...(locked ? [edge("cron", "zk", "lock")] : []),
        ],
      );

    test("flags replicas that all fire, and not one replica or a lock", () => {
      expect(hits(cron(2, false), "duplicate-schedule")).toEqual(["cron"]);
      expect(hits(cron(1, false), "duplicate-schedule")).toEqual([]);
      expect(hits(cron(2, true), "duplicate-schedule")).toEqual([]);
    });

    test("reaches what a scheduler starts, and not a lonely coordination service", () => {
      expect(hits(cron(2, true), "unreachable-node")).toEqual([]);
      expect(hits(cron(2, false), "unreachable-node")).toEqual(["zk"]);
    });
  });

  describe("dual-write", () => {
    const writes = (fed: boolean) =>
      graph(
        [
          node("users", "client"),
          node("api", "service", { replicas: 2 }),
          node("db", "sql-database"),
          node("search", "search-index"),
        ],
        [
          edge("users", "api"),
          edge("api", "db", "write"),
          edge("api", "search", "read"),
          fed
            ? edge("db", "search", "change-feed")
            : edge("api", "search", "write"),
        ],
      );

    test("flags a service that writes a database and an index itself", () => {
      expect(hits(writes(false), "dual-write")).toEqual(["api+db+search"]);
    });

    test("accepts an index fed by the database's change feed", () => {
      expect(hits(writes(true), "dual-write")).toEqual([]);
    });
  });

  test("flags a coordination service without a quorum that a scheduler locks on", () => {
    const g = graph(
      [
        node("cron", "scheduler", { replicas: 2 }),
        node("jobs", "queue"),
        node("worker", "worker", { replicas: 2 }),
        node("zk", "coordination", { members: 1 }),
      ],
      [
        edge("cron", "jobs", "async-message"),
        edge("jobs", "worker", "async-message"),
        edge("cron", "zk", "lock"),
      ],
    );

    expect(hits(g, "spof-critical-path")).toEqual(["zk"]);
  });
  describe("failover-nowhere", () => {
    const dns = (regions: [string, string]) => ({
      ...graph(
        [
          node("users", "client"),
          node("dns", "dns", { policy: "failover" }),
          { ...node("a", "load-balancer"), groupId: regions[0] },
          { ...node("b", "load-balancer"), groupId: regions[1] },
        ],
        [edge("users", "dns"), edge("dns", "a"), edge("dns", "b")],
      ),
      groups: [
        createGroup({ id: "eu", kind: "region", label: "EU" }),
        createGroup({ id: "us", kind: "region", label: "US" }),
      ],
    });

    test("flags failover whose targets all sit in one region", () => {
      expect(hits(dns(["eu", "eu"]), "failover-nowhere")).toEqual(["dns+a+b"]);
    });

    test("accepts targets in two regions", () => {
      expect(hits(dns(["eu", "us"]), "failover-nowhere")).toEqual([]);
    });
  });
  describe("sync-fan-out", () => {
    const feed = (kind: EdgeKind) =>
      graph(
        [
          node("users", "client"),
          node("api", "service", { replicas: 2 }),
          node("feeds", "cache"),
          node("events", "stream"),
          node("fanout", "worker", { replicas: 2 }),
        ],
        kind === "async-message"
          ? [
              edge("users", "api"),
              edge("api", "events", "write"),
              edge("events", "fanout", "async-message"),
              {
                ...edge("fanout", "feeds", "write"),
                props: EdgePropsSchema.parse({ fanOut: 100 }),
              },
            ]
          : [
              edge("users", "api"),
              {
                ...edge("api", "feeds", kind),
                props: EdgePropsSchema.parse({ fanOut: 100 }),
              },
            ],
      );

    test("flags a hundred writes the user waits for", () => {
      expect(hits(feed("write"), "sync-fan-out")).toEqual(["api+feeds"]);
    });

    test("accepts the same fan-out done by workers behind a stream", () => {
      expect(hits(feed("async-message"), "sync-fan-out")).toEqual([]);
    });
  });
});
