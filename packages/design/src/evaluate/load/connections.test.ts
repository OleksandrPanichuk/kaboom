import { describe, expect, test } from "bun:test";

import type { DesignEdge } from "../../graph";
import { evaluateLoad } from "./evaluate-load";
import { edge, graph, node } from "./fixtures";

const pooled = (link: DesignEdge, poolSize: number): DesignEdge => ({
  ...link,
  connection: { poolSize },
});

const shop = ({
  replicas = 2,
  autoscale = false,
  maxConnections,
  poolSize,
  pooler = false,
}: {
  replicas?: number;
  autoscale?: boolean;
  maxConnections?: number;
  poolSize?: number;
  pooler?: boolean;
} = {}) => {
  const callDb = edge("api", pooler ? "pooler" : "db", "sync-call");

  return graph(
    [
      node("users", "client", { rps: 1_000, readRatio: 0.5 }),
      node("api", "service", {
        replicas,
        capacityRpsPerReplica: 100,
        autoscale: {
          enabled: autoscale,
          min: replicas,
          max: 200,
          targetUtilisation: 0.7,
        },
      }),
      ...(pooler ? [node("pooler", "connection-pooler")] : []),
      node("db", "sql-database", {
        readCapacityRps: 100_000,
        writeCapacityRps: 100_000,
        ...(maxConnections !== undefined ? { maxConnections } : {}),
      }),
    ],
    [
      edge("users", "api"),
      poolSize !== undefined ? pooled(callDb, poolSize) : callDb,
      ...(pooler ? [pooled(edge("pooler", "db", "sync-call"), 20)] : []),
    ],
  );
};

const run = (design: ReturnType<typeof graph>, durationSeconds = 10) =>
  evaluateLoad(design, { kind: "load", durationSeconds });

describe("connections", () => {
  test("every replica of a caller holds a pool of ten connections by default", () => {
    const step = run(shop({ replicas: 12 })).steps[0]!;

    expect(step.nodes.db!.connections).toEqual({ demanded: 120, max: 1_000 });
    expect(step.nodes.db!.ownErrorRate).toBe(0);
  });

  test("a database refuses what its connection limit cannot hold, and says so", () => {
    const { steps, findings } = run(shop({ replicas: 12, maxConnections: 60 }));
    const db = steps[0]!.nodes.db!;

    expect(db.connections).toEqual({ demanded: 120, max: 60 });
    expect(db.ownErrorRate).toBeCloseTo(0.5, 9);
    expect(findings.map((finding) => finding.kind)).toContain(
      "connections-exhausted",
    );
    expect(findings.some((finding) => finding.kind === "errors")).toBe(false);
  });

  test("an edge's pool size replaces the default", () => {
    const step = run(shop({ replicas: 12, poolSize: 2 })).steps[0]!;

    expect(step.nodes.db!.connections?.demanded).toBe(24);
  });

  test("a read and a write from one caller share one pool", () => {
    const design = graph(
      [
        node("users", "client", { rps: 100 }),
        node("api", "service", { replicas: 3 }),
        node("db", "sql-database"),
      ],
      [
        edge("users", "api"),
        edge("api", "db", "read"),
        edge("api", "db", "write"),
      ],
    );

    expect(run(design).steps[0]!.nodes.db!.connections?.demanded).toBe(30);
  });

  test("autoscaling the callers can exhaust the database", () => {
    const { steps, findings } = run(
      shop({ replicas: 2, autoscale: true, maxConnections: 100 }),
      120,
    );

    expect(steps[0]!.nodes.db!.ownErrorRate).toBe(0);
    expect(steps.at(-1)!.nodes.api!.replicas).toBeGreaterThan(10);
    expect(steps.at(-1)!.nodes.db!.ownErrorRate).toBeGreaterThan(0);
    expect(
      findings.find((finding) => finding.kind === "connections-exhausted")
        ?.atStep,
    ).toBeGreaterThan(0);
  });

  test("a pooler holds the callers' connections and opens only its own pool to the database", () => {
    const step = run(shop({ replicas: 12, maxConnections: 60, pooler: true }))
      .steps[0]!;

    expect(step.nodes.pooler!.connections).toEqual({
      demanded: 120,
      max: 10_000,
    });
    expect(step.nodes.db!.connections).toEqual({ demanded: 20, max: 60 });
    expect(step.clients.users!.availability).toBe(1);
  });

  test("a pooler passes on no more than its server connections can carry", () => {
    const design = shop({ replicas: 12, pooler: true });
    const starved = {
      ...design,
      edges: design.edges.map((item) =>
        item.from === "pooler" ? pooled(item, 2) : item,
      ),
    };
    const step = run(starved).steps[0]!;

    expect(step.nodes.pooler!.rho).toBeCloseTo(1_000 / 400, 6);
    expect(step.clients.users!.availability).toBeLessThan(0.5);
  });

  test("refused connections are a lasting error, so a retry does not rescue them", () => {
    const design = shop({ replicas: 12, maxConnections: 60 });
    const retried = {
      ...design,
      edges: design.edges.map((item) =>
        item.to === "db"
          ? { ...item, props: { ...item.props, retries: 3 } }
          : item,
      ),
    };
    const { steps } = run(retried, 30);

    expect(steps.at(-1)!.clients.users!.availability).toBeCloseTo(0.5, 6);
  });
});
