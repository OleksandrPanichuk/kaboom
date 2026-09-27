import { describe, expect, test } from "bun:test";

import { evaluateLoad } from "./evaluate-load";
import { edge, graph, node } from "./fixtures";

const service = (
  id: string,
  replicas: number,
  perReplica: number,
  extra = {},
) =>
  node(id, "service", {
    replicas,
    capacityRpsPerReplica: perReplica,
    ...extra,
  });

describe("golden fixtures", () => {
  test("1. a balancer splits evenly over three services and conserves the total", () => {
    const design = graph(
      [
        node("users", "client", { rps: 3_000 }),
        node("lb", "load-balancer"),
        service("a", 2, 1_000),
        service("b", 2, 1_000),
        service("c", 2, 1_000),
      ],
      [edge("users", "lb"), edge("lb", "a"), edge("lb", "b"), edge("lb", "c")],
    );
    const [step] = evaluateLoad(design, {
      kind: "load",
      durationSeconds: 10,
    }).steps;
    const received = ["a", "b", "c"].map(
      (id) => step!.nodes[id]!.reads + step!.nodes[id]!.writes,
    );

    expect(received.map((value) => Math.round(value))).toEqual([
      1_000, 1_000, 1_000,
    ]);
    expect(received.reduce((sum, value) => sum + value, 0)).toBeCloseTo(
      3_000,
      6,
    );
    expect(step!.nodes.a!.rho).toBeCloseTo(0.5, 6);
  });

  test("2. a cache with an 80 % hit ratio sends a fifth of the reads on to the database", () => {
    const design = graph(
      [
        node("users", "client", { rps: 1_000, readRatio: 0.9 }),
        service("api", 4, 1_000),
        node("cache", "cache", { hitRatio: 0.8 }),
        node("db", "sql-database"),
      ],
      [
        edge("users", "api"),
        edge("api", "cache", "read"),
        edge("api", "db", "write"),
        edge("cache", "db", "read"),
      ],
    );
    const [step] = evaluateLoad(design, {
      kind: "load",
      durationSeconds: 10,
    }).steps;

    expect(step!.nodes.api!.reads).toBeCloseTo(900, 6);
    expect(step!.nodes.db!.reads).toBeCloseTo(0.2 * 900, 6);
    expect(step!.nodes.db!.writes).toBeCloseTo(100, 6);
  });

  describe("3. a write-heavy database", () => {
    const writeHeavy = (database: Record<string, unknown>, replicas: number) =>
      graph(
        [
          node("users", "client", { rps: 3_000, readRatio: 0.1 }),
          service("api", 10, 1_000),
          node("db", "sql-database", { writeCapacityRps: 1_000, ...database }),
          ...Array.from({ length: replicas }, (_, index) =>
            node(`replica-${index}`, "sql-database"),
          ),
        ],
        [
          edge("users", "api"),
          edge("api", "db", "write"),
          edge("api", "db", "read"),
          ...Array.from({ length: replicas }, (_, index) =>
            edge("db", `replica-${index}`, "replication"),
          ),
        ],
      );
    const first = (design: ReturnType<typeof writeHeavy>) =>
      evaluateLoad(design, { kind: "load", durationSeconds: 10 });

    test("saturates the primary with two read replicas", () => {
      const result = first(writeHeavy({}, 2));

      expect(result.steps[0]!.nodes.db!.rho).toBeCloseTo(2.7, 6);
      expect(result.findings.map((finding) => finding.kind)).toContain(
        "saturated",
      );
    });

    test("does not change when a third replica is added", () => {
      expect(first(writeHeavy({}, 3)).steps[0]!.nodes.db!.rho).toBeCloseTo(
        2.7,
        6,
      );
    });

    test("recovers with shards", () => {
      expect(
        first(writeHeavy({ shards: 3 }, 2)).steps[0]!.nodes.db!.rho,
      ).toBeCloseTo(0.9, 6);
    });

    test("stops failing requests behind a queue, which absorbs the excess", () => {
      const design = graph(
        [
          node("users", "client", { rps: 3_000, readRatio: 0.1 }),
          service("api", 10, 1_000),
          node("q", "queue"),
          node("writer", "worker", { replicas: 1, capacityMsgPerReplica: 900 }),
          node("db", "sql-database", { writeCapacityRps: 1_000 }),
        ],
        [
          edge("users", "api"),
          edge("api", "q", "async-message"),
          edge("q", "writer", "async-message"),
          edge("writer", "db", "write"),
        ],
      );
      const result = evaluateLoad(design, {
        kind: "load",
        durationSeconds: 30,
      });
      const step = result.steps[2]!;

      expect(step.clients.users!.availability).toBe(1);
      expect(step.nodes.db!.rho).toBeLessThan(0.95);
      expect(result.findings.map((finding) => finding.kind)).toContain(
        "backlog-growing",
      );
    });
  });

  describe("4. a queue fed faster than its workers", () => {
    const design = graph(
      [
        node("producer", "client", { rps: 1_000 }),
        node("q", "queue"),
        node("worker", "worker", { replicas: 1, capacityMsgPerReplica: 500 }),
      ],
      [
        edge("producer", "q", "async-message"),
        edge("q", "worker", "async-message"),
      ],
    );

    test("grows its backlog linearly", () => {
      const { steps } = evaluateLoad(design, {
        kind: "load",
        durationSeconds: 60,
      });
      const backlog = steps.map((step) => step.nodes.q!.backlog!);

      backlog.forEach((value, index) =>
        expect(value).toBeCloseTo((1_000 - 475) * 10 * (index + 1), 6),
      );
    });

    test("drains to zero at the expected step once the inflow stops", () => {
      const { steps } = evaluateLoad(design, {
        kind: "load",
        durationSeconds: 200,
        traffic: [{ at: 60, multiplier: 0 }],
      });
      const backlog = steps.map((step) => step.nodes.q!.backlog!);

      expect(backlog[5]).toBeCloseTo(31_500, 6);
      expect(backlog[11]).toBeCloseTo(3_000, 6);
      expect(backlog.findIndex((value) => value === 0)).toBe(12);
    });

    test("drains once autoscaling has added enough workers", () => {
      const scaled = graph(
        design.nodes.map((item) =>
          item.id === "worker"
            ? node("worker", "worker", {
                replicas: 1,
                capacityMsgPerReplica: 500,
                autoscale: {
                  enabled: true,
                  min: 1,
                  max: 4,
                  targetUtilisation: 0.7,
                },
              })
            : item,
        ),
        design.edges,
      );
      const { steps } = evaluateLoad(scaled, {
        kind: "load",
        durationSeconds: 600,
      });
      const replicas = steps.map((step) => step.nodes.worker!.replicas!);
      const backlog = steps.map((step) => step.nodes.q!.backlog!);
      const enough = replicas.findIndex((value) => value >= 3);

      expect(enough).toBeGreaterThan(0);
      expect(backlog[enough]!).toBeLessThan(backlog[enough - 1]!);
      expect(backlog.at(-1)).toBe(0);
    });
  });

  test("5. a primary down with automatic failover and one replica fails for 30 s, then recovers", () => {
    const design = graph(
      [
        node("users", "client", { rps: 100 }),
        service("api", 2, 1_000),
        node("db", "sql-database", { failover: "automatic" }),
        node("replica", "sql-database"),
      ],
      [
        edge("users", "api"),
        edge("api", "db", "write"),
        edge("api", "db", "read"),
        edge("db", "replica", "replication"),
      ],
    );
    const { steps, findings } = evaluateLoad(design, {
      kind: "load",
      durationSeconds: 150,
      faults: [{ kind: "node-down", nodeId: "db", at: 60 }],
    });
    const availability = steps.map((step) => step.clients.users!.availability);

    expect(availability.slice(0, 6)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(availability.slice(6, 9)).toEqual([0, 0, 0]);
    expect(availability.slice(9)).toEqual(Array.from({ length: 6 }, () => 1));
    expect(steps[9]!.nodes.db!.up).toBe(true);
    expect(findings.find((finding) => finding.kind === "errors")?.atStep).toBe(
      6,
    );
  });

  test("6. a tenfold spike on an autoscaled service saturates it for two steps, then scales until it copes", () => {
    const design = graph(
      [
        node("users", "client", { rps: 100 }),
        service("api", 2, 100, {
          autoscale: { enabled: true, min: 2, max: 40, targetUtilisation: 0.7 },
        }),
      ],
      [edge("users", "api")],
    );
    const { steps, findings } = evaluateLoad(design, {
      kind: "load",
      durationSeconds: 300,
      traffic: [{ at: 60, multiplier: 10 }],
    });
    const replicas = steps.map((step) => step.nodes.api!.replicas!);
    const rho = steps.map((step) => step.nodes.api!.rho);

    expect(replicas.slice(0, 8)).toEqual([2, 2, 2, 2, 2, 2, 2, 2]);
    expect(rho[6]).toBeCloseTo(5, 6);
    expect(rho[7]).toBeCloseTo(5, 6);
    expect(replicas[8]).toBe(3);
    replicas.forEach((value, index) =>
      expect(value).toBeGreaterThanOrEqual(replicas[index - 1] ?? value),
    );
    expect(rho.slice(8).some((value) => value < 0.7)).toBe(true);
    expect(
      findings.find((finding) => finding.kind === "saturated")?.atStep,
    ).toBe(6);
  });

  test("7. a cache flush sends every read to the database, then decays over 60 s", () => {
    const design = graph(
      [
        node("users", "client", { rps: 1_000, readRatio: 1 }),
        service("api", 4, 1_000),
        node("cache", "cache", { hitRatio: 0.8 }),
        node("db", "sql-database", { readCapacityRps: 10_000 }),
      ],
      [
        edge("users", "api"),
        edge("api", "cache", "read"),
        edge("cache", "db", "read"),
      ],
    );
    const { steps } = evaluateLoad(design, {
      kind: "load",
      durationSeconds: 150,
      faults: [{ kind: "cache-flush", nodeId: "cache", at: 60 }],
    });
    const dbReads = steps.map((step) => step.nodes.db!.reads);

    expect(dbReads[5]).toBeCloseTo(200, 6);
    expect(dbReads[6]).toBeCloseTo(1_000, 6);
    expect(dbReads[7]).toBeCloseTo(1_000 * (1 - 0.8 / 6), 6);
    expect(dbReads[9]).toBeCloseTo(1_000 * (1 - 0.8 / 2), 6);
    expect(dbReads[12]).toBeCloseTo(200, 6);
    for (let index = 7; index <= 12; index++) {
      expect(dbReads[index]!).toBeLessThan(dbReads[index - 1]!);
    }
  });
});
