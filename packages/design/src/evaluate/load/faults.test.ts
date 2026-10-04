import { describe, expect, test } from "bun:test";

import { createGroup, type DesignGraph } from "../../graph";
import type { Fault } from "../scenario";
import { evaluateLoad } from "./evaluate-load";
import { edge, graph, node } from "./fixtures";

const run = (design: DesignGraph, faults: Fault[], durationSeconds = 300) =>
  evaluateLoad(design, { kind: "load", durationSeconds, faults });

const availability = (result: ReturnType<typeof run>, client = "users") =>
  result.steps.map((step) => step.clients[client]!.availability);

const kinds = (result: ReturnType<typeof run>) =>
  result.findings.map((finding) => finding.kind);

const flaky = (retries: number, capacity = 10_000) =>
  graph(
    [
      node("users", "client", { rps: 1_000, readRatio: 1 }),
      node("api", "service", {
        replicas: 1,
        capacityRpsPerReplica: capacity,
      }),
    ],
    [edge("users", "api", "sync-call", { retries })],
  );

describe("an error-rate fault", () => {
  test("fails its share of requests while it lasts", () => {
    const result = run(flaky(0), [
      { kind: "error-rate", nodeId: "api", at: 60, until: 120, rate: 0.2 },
    ]);
    const served = availability(result);

    expect(served[5]).toBe(1);
    expect(served[7]).toBeCloseTo(0.8);
    expect(served[13]).toBe(1);
  });
});

describe("retries", () => {
  const failing: Fault[] = [
    { kind: "error-rate", nodeId: "api", at: 0, rate: 0.2 },
  ];

  test("turn a flaky target's failures into far fewer, for more load on it", () => {
    const once = run(flaky(0), failing);
    const thrice = run(flaky(2), failing);
    const load = (result: ReturnType<typeof run>) =>
      result.steps.at(-1)!.nodes.api!.reads;

    expect(availability(once).at(-1)).toBeCloseTo(0.8);
    expect(availability(thrice).at(-1)).toBeCloseTo(1 - 0.2 ** 3);
    expect(load(thrice)).toBeCloseTo(1_000 * (1 + 0.2 + 0.04));
  });

  test("double p99 once more than 1 % of calls fail", () => {
    const calm = run(flaky(2), []);
    const rough = run(flaky(2), failing);

    expect(rough.steps.at(-1)!.clients.users!.p99).toBeGreaterThanOrEqual(
      2 * calm.steps.at(-1)!.clients.users!.p99,
    );
  });

  test("pile onto a saturated target until the retries are most of its load", () => {
    const result = run(flaky(3, 1_000), [
      { kind: "capacity", nodeId: "api", at: 30, factor: 0.8 },
    ]);
    const factor = result.steps.at(-1)!.nodes.api!.reads / 1_000;

    expect(kinds(result)).toContain("retry-storm");
    expect(factor).toBeGreaterThan(1.5);
  });
});

const zoned = (groupKind: "region" | "private-subnet") =>
  ({
    ...graph(
      [
        node("users", "client", { rps: 1_000, readRatio: 1 }),
        {
          ...node("api", "service", {
            replicas: 2,
            capacityRpsPerReplica: 2_000,
          }),
          groupId: "zone",
        },
      ],
      [edge("users", "api")],
    ),
    groups: [createGroup({ id: "zone", kind: groupKind, label: "Zone" })],
  }) satisfies DesignGraph;

describe("a group-down fault", () => {
  test("takes every node in any group down, not only a region's", () => {
    const result = run(zoned("private-subnet"), [
      { kind: "group-down", groupId: "zone", at: 60, until: 120 },
    ]);

    expect(availability(result).slice(5, 13)).toEqual([1, 0, 0, 0, 0, 0, 0, 1]);
  });
});

describe("a partition", () => {
  test("fails every synchronous call across the group's edge while the nodes stay up", () => {
    const result = run(zoned("region"), [
      { kind: "partition", groupId: "zone", at: 60, until: 120 },
    ]);

    expect(availability(result).slice(5, 13)).toEqual([1, 0, 0, 0, 0, 0, 0, 1]);
    expect(result.steps[8]!.nodes.api!.up).toBe(true);
    expect(result.steps[8]!.nodes.api!.reads).toBe(0);
  });

  test("lets DNS move users away once its TTL runs out", () => {
    const design: DesignGraph = {
      ...graph(
        [
          node("users", "client", { rps: 1_000, readRatio: 1 }),
          node("dns", "dns", { policy: "latency", ttlSeconds: 60 }),
          { ...node("eu", "service", { replicas: 4 }), groupId: "eu-region" },
          { ...node("us", "service", { replicas: 4 }), groupId: "us-region" },
        ],
        [
          edge("users", "dns"),
          edge("dns", "eu", "sync-call", { share: 0.5 }),
          edge("dns", "us", "sync-call", { share: 0.5 }),
        ],
      ),
      groups: [
        createGroup({ id: "eu-region", kind: "region", label: "EU" }),
        createGroup({ id: "us-region", kind: "region", label: "US" }),
      ],
    };
    const served = availability(
      run(design, [{ kind: "partition", groupId: "eu-region", at: 60 }]),
    );

    expect(served[7]).toBeCloseTo(0.5);
    expect(served.at(-1)).toBe(1);
  });

  test("backs messages up when the consumer is on the other side", () => {
    const design: DesignGraph = {
      ...graph(
        [
          node("users", "client", { rps: 100, readRatio: 0 }),
          node("api", "service"),
          node("jobs", "queue"),
          { ...node("worker", "worker"), groupId: "zone" },
        ],
        [
          edge("users", "api"),
          edge("api", "jobs", "async-message"),
          edge("jobs", "worker", "async-message"),
        ],
      ),
      groups: [createGroup({ id: "zone", kind: "region", label: "Zone" })],
    };
    const result = run(design, [
      { kind: "partition", groupId: "zone", at: 60 },
    ]);

    expect(result.steps.at(-1)!.nodes.jobs!.backlog).toBeGreaterThan(0);
    expect(availability(result).at(-1)).toBe(1);
    expect(kinds(result)).toContain("backlog-growing");
  });
});

describe("found in review", () => {
  const balanced = (retries: number) =>
    graph(
      [
        node("users", "client", { rps: 1_000, readRatio: 1 }),
        node("lb", "load-balancer", { healthCheck: true }),
        node("a", "service", { replicas: 4 }),
        node("b", "service", { replicas: 4 }),
      ],
      [
        edge("users", "lb"),
        edge("lb", "a", "sync-call", { retries }),
        edge("lb", "b", "sync-call", { retries }),
      ],
    );

  test("an idle edge into a dead target is no retry storm", () => {
    const result = run(balanced(2), [
      { kind: "node-down", nodeId: "a", at: 0 },
    ]);

    expect(availability(result).at(-1)).toBe(1);
    expect(kinds(result)).not.toContain("retry-storm");
  });

  test("a load balancer with no target left fails what it cannot forward", () => {
    const result = run(balanced(0), [
      { kind: "node-down", nodeId: "a", at: 0 },
      { kind: "node-down", nodeId: "b", at: 0 },
    ]);

    expect(availability(result).at(-1)).toBe(0);
  });

  test("a cut call waits out its timeout once per attempt", () => {
    const design = {
      ...zoned("region"),
      edges: [
        edge("users", "api", "sync-call", { retries: 2, timeoutMs: 1_000 }),
      ],
    };
    const result = run(design, [{ kind: "partition", groupId: "zone", at: 0 }]);

    expect(result.steps.at(-1)!.clients.users!.p99).toBeGreaterThanOrEqual(
      3_000,
    );
  });
});

describe("retries upstream of a dead dependency", () => {
  const design = (retries: number) =>
    graph(
      [
        node("users", "client", { rps: 1_000, readRatio: 1 }),
        node("lb", "load-balancer"),
        node("api", "service", { replicas: 10 }),
        node("db", "sql-database"),
        node("search", "search-index"),
      ],
      [
        edge("users", "lb", "sync-call", { retries }),
        edge("lb", "api", "sync-call", { retries }),
        edge("api", "db", "read", { share: 0.9 }),
        edge("api", "search", "read", { share: 0.1 }),
      ],
    );

  test("cannot rescue the requests that need it, and send it more of them", () => {
    const faults: Fault[] = [{ kind: "node-down", nodeId: "search", at: 0 }];
    const plain = run(design(0), faults);
    const retried = run(design(2), faults);
    const last = (result: ReturnType<typeof run>) => result.steps.at(-1)!;

    expect(last(plain).clients.users!.availability).toBeCloseTo(0.9);
    expect(last(retried).clients.users!.availability).toBeCloseTo(0.9);
    expect(last(retried).nodes.search!.reads).toBeGreaterThan(
      last(plain).nodes.search!.reads,
    );
  });
});
