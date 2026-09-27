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
  describe("8. a rate limiter turns the excess away fast and keeps the database alive", () => {
    const spike = (limited: boolean) =>
      graph(
        [
          node("users", "client", { rps: 20_000, readRatio: 1 }),
          ...(limited
            ? [node("limiter", "rate-limiter", { limitRps: 10_000 })]
            : []),
          service("api", 10, 2_000),
          node("db", "sql-database", { readCapacityRps: 12_000 }),
        ],
        [
          ...(limited
            ? [edge("users", "limiter"), edge("limiter", "api")]
            : [edge("users", "api")]),
          edge("api", "db", "read"),
        ],
      );
    const run = (limited: boolean) =>
      evaluateLoad(spike(limited), { kind: "load", durationSeconds: 10 });

    test("with a limiter, half is turned away and the rest stays fast", () => {
      const { steps, findings } = run(true);
      const step = steps[0]!;

      expect(step.nodes.limiter!.throttled).toBeCloseTo(10_000, 6);
      expect(step.nodes.limiter!.ownErrorRate).toBeCloseTo(0.5, 6);
      expect(step.nodes.api!.reads).toBeCloseTo(10_000, 6);
      expect(step.nodes.db!.rho).toBeLessThan(0.95);
      expect(step.clients.users!.availability).toBeCloseTo(0.5, 6);
      expect(step.clients.users!.p99).toBeLessThan(1_000);
      expect(findings.map((finding) => finding.kind)).toContain("throttled");
      expect(
        findings.filter(
          (finding) =>
            finding.kind === "errors" && finding.target.id === "limiter",
        ),
      ).toEqual([]);
    });

    test("without one, the database saturates and every request waits for the timeout", () => {
      const step = run(false).steps[0]!;

      expect(step.nodes.db!.rho).toBeGreaterThan(0.95);
      expect(step.clients.users!.p99).toBeGreaterThanOrEqual(1_000);
    });
  });

  describe("9. a third party on the request path passes its errors to the user, and a queue absorbs them", () => {
    const payments = node("payments", "external-api", { errorRate: 0.02 });

    test("called synchronously, its error rate is the user's", () => {
      const step = evaluateLoad(
        graph(
          [
            node("users", "client", { rps: 100 }),
            service("api", 2, 1_000),
            payments,
          ],
          [edge("users", "api"), edge("api", "payments")],
        ),
        { kind: "load", durationSeconds: 10 },
      ).steps[0]!;

      expect(step.nodes.payments!.ownErrorRate).toBeCloseTo(0.02, 6);
      expect(step.clients.users!.availability).toBeCloseTo(0.98, 6);
    });

    test("behind a queue and a worker, the user is not affected", () => {
      const step = evaluateLoad(
        graph(
          [
            node("users", "client", { rps: 100 }),
            service("api", 2, 1_000),
            node("jobs", "queue"),
            node("worker", "worker", { replicas: 2 }),
            payments,
          ],
          [
            edge("users", "api"),
            edge("api", "jobs", "async-message"),
            edge("jobs", "worker", "async-message"),
            edge("worker", "payments"),
          ],
        ),
        { kind: "load", durationSeconds: 10 },
      ).steps[0]!;

      expect(step.nodes.payments!.ownErrorRate).toBeCloseTo(0.02, 6);
      expect(step.clients.users!.availability).toBeCloseTo(1, 6);
    });
  });

  test("10. calls above a provider's rate limit fail at once, without waiting", () => {
    const step = evaluateLoad(
      graph(
        [
          node("users", "client", { rps: 1_000 }),
          service("api", 2, 1_000),
          node("sms", "external-api", { rateLimitRps: 500, errorRate: 0 }),
        ],
        [edge("users", "api"), edge("api", "sms")],
      ),
      { kind: "load", durationSeconds: 10 },
    ).steps[0]!;

    expect(step.nodes.sms!.throttled).toBeCloseTo(500, 6);
    expect(step.nodes.sms!.ownErrorRate).toBeCloseTo(0.5, 6);
    expect(step.nodes.sms!.p99).toBeCloseTo(150, 6);
  });

  test("11. a gateway without throttling passes everything on", () => {
    const step = evaluateLoad(
      graph(
        [
          node("users", "client", { rps: 30_000 }),
          node("gw", "api-gateway"),
          service("api", 20, 2_000),
        ],
        [edge("users", "gw"), edge("gw", "api")],
      ),
      { kind: "load", durationSeconds: 10 },
    ).steps[0]!;

    expect(step.nodes.gw!.throttled).toBeUndefined();
    expect(step.nodes.api!.reads + step.nodes.api!.writes).toBeCloseTo(
      30_000,
      6,
    );
  });
  describe("12. a change feed carries a database's writes to a search index", () => {
    const search = (index: Record<string, unknown>) =>
      graph(
        [
          node("users", "client", { rps: 1_000, readRatio: 0.8 }),
          service("api", 2, 1_000),
          node("db", "sql-database"),
          node("index", "search-index", index),
        ],
        [
          edge("users", "api"),
          edge("api", "db", "write"),
          edge("api", "index", "read"),
          edge("db", "index", "change-feed"),
        ],
      );
    const first = (index: Record<string, unknown>) =>
      evaluateLoad(search(index), { kind: "load", durationSeconds: 10 })
        .steps[0]!;

    test("queries go to the index and writes reach it through the feed alone", () => {
      const step = first({});

      expect(step.nodes.index!.reads).toBeCloseTo(800, 6);
      expect(step.nodes.index!.writes).toBeCloseTo(200, 6);
      expect(step.clients.users!.availability).toBeCloseTo(1, 6);
    });

    test("indexing beyond its capacity slows and fails the queries too", () => {
      const step = first({ shards: 1, indexCapacityPerShard: 100 });

      expect(step.nodes.index!.rho).toBeCloseTo(2, 6);
      expect(step.clients.users!.availability).toBeLessThan(0.8);
    });
  });

  describe("13. a scheduler fires its bursts, once per replica unless they share a lock", () => {
    const cron = (replicas: number, lock: "none" | "up" | "down") => {
      const design = graph(
        [
          node("cron", "scheduler", {
            everySeconds: 60,
            burstSeconds: 10,
            jobsPerSecond: 100,
            replicas,
          }),
          node("jobs", "queue"),
          node("worker", "worker", { replicas: 2 }),
          ...(lock === "none" ? [] : [node("zk", "coordination")]),
        ],
        [
          edge("cron", "jobs", "async-message"),
          edge("jobs", "worker", "async-message"),
          ...(lock === "none" ? [] : [edge("cron", "zk", "lock")]),
        ],
      );

      return evaluateLoad(design, {
        kind: "load",
        durationSeconds: 120,
        faults:
          lock === "down" ? [{ kind: "node-down", nodeId: "zk", at: 0 }] : [],
      }).steps.map((step) => Math.round(step.nodes.jobs!.writes));
    };

    test("one replica sends its burst every minute", () => {
      expect(cron(1, "none")).toEqual([100, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 0]);
    });

    test("two replicas without a lock send every job twice", () => {
      expect(cron(2, "none")[0]).toBe(200);
    });

    test("with a lock only the holder fires, and with the lock service down nobody does", () => {
      expect(cron(2, "up")[0]).toBe(100);
      expect(cron(2, "down")[0]).toBe(0);
    });
  });

  test("14. a burst shorter than a step is spread over it", () => {
    const step = evaluateLoad(
      graph(
        [
          node("cron", "scheduler", {
            everySeconds: 300,
            burstSeconds: 5,
            jobsPerSecond: 100,
          }),
          node("jobs", "queue"),
          node("worker", "worker"),
        ],
        [
          edge("cron", "jobs", "async-message"),
          edge("jobs", "worker", "async-message"),
        ],
      ),
      { kind: "load", durationSeconds: 10 },
    ).steps[0]!;

    expect(step.nodes.jobs!.writes).toBeCloseTo(50, 6);
  });
});
