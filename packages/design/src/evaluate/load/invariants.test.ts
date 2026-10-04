import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import {
  createGroup,
  type DesignEdge,
  type DesignGraph,
  type DesignNode,
} from "../../graph";
import type { EvaluationResult } from "../result";
import type { Fault, LoadScenarioInput } from "../scenario";
import { evaluateLoad } from "./evaluate-load";
import { edge, graph, node } from "./fixtures";

interface Shape {
  rps: number;
  readRatio: number;
  balanced: boolean;
  tiers: number;
  replicas: number[];
  capacity: number[];
  cache: boolean;
  hitRatio: number;
  database: "sql-database" | "nosql-database";
  databaseCapacity: number;
  queue: boolean;
  workerReplicas: number;
  retries: number;
  timeoutMs: number;
  zones: number[];
}

const shapes = fc.record({
  rps: fc.integer({ min: 10, max: 20_000 }),
  readRatio: fc.double({ min: 0, max: 1, noNaN: true }),
  balanced: fc.boolean(),
  tiers: fc.integer({ min: 1, max: 3 }),
  replicas: fc.array(fc.integer({ min: 1, max: 8 }), {
    minLength: 3,
    maxLength: 3,
  }),
  capacity: fc.array(fc.integer({ min: 100, max: 5_000 }), {
    minLength: 3,
    maxLength: 3,
  }),
  cache: fc.boolean(),
  hitRatio: fc.double({ min: 0, max: 0.99, noNaN: true }),
  database: fc.constantFrom("sql-database", "nosql-database"),
  databaseCapacity: fc.integer({ min: 200, max: 20_000 }),
  queue: fc.boolean(),
  workerReplicas: fc.integer({ min: 1, max: 6 }),
  retries: fc.integer({ min: 0, max: 3 }),
  timeoutMs: fc.integer({ min: 50, max: 3_000 }),
  zones: fc.array(fc.integer({ min: 0, max: 2 }), {
    minLength: 9,
    maxLength: 9,
  }),
});

const ZONES = ["eu", "us"] as const;

const build = (shape: Shape): DesignGraph => {
  const nodes: DesignNode[] = [
    node("users", "client", { rps: shape.rps, readRatio: shape.readRatio }),
  ];
  const edges: DesignEdge[] = [];
  const call = (from: string, to: string) =>
    edges.push(
      edge(from, to, "sync-call", {
        retries: shape.retries,
        timeoutMs: shape.timeoutMs,
      }),
    );
  let previous = "users";

  if (shape.balanced) {
    nodes.push(node("lb", "load-balancer"));
    call("users", "lb");
    previous = "lb";
  }

  for (let tier = 0; tier < shape.tiers; tier += 1) {
    const id = `tier-${tier}`;

    nodes.push(
      node(id, "service", {
        replicas: shape.replicas[tier]!,
        capacityRpsPerReplica: shape.capacity[tier]!,
      }),
    );
    call(previous, id);
    previous = id;
  }

  const database =
    shape.database === "sql-database"
      ? node("db", "sql-database", {
          readCapacityRps: shape.databaseCapacity,
          writeCapacityRps: Math.max(1, Math.round(shape.databaseCapacity / 4)),
        })
      : node("db", "nosql-database", {
          readCapacityPerPartition: shape.databaseCapacity,
          writeCapacityPerPartition: Math.max(
            1,
            Math.round(shape.databaseCapacity / 3),
          ),
        });

  nodes.push(database);

  if (shape.cache) {
    nodes.push(node("cache", "cache", { hitRatio: shape.hitRatio }));
    call(previous, "cache");
    edges.push(edge("cache", "db", "sync-call", { retries: shape.retries }));
  } else {
    call(previous, "db");
  }

  if (shape.queue) {
    nodes.push(
      node("jobs", "queue"),
      node("worker", "worker", { replicas: shape.workerReplicas }),
    );
    edges.push(
      edge(previous, "jobs", "async-message"),
      edge("jobs", "worker", "async-message"),
    );
    call("worker", "db");
  }

  return {
    ...graph(
      nodes.map((item, index) => {
        const zone = item.kind === "client" ? 2 : (shape.zones[index] ?? 2);

        return zone < ZONES.length ? { ...item, groupId: ZONES[zone]! } : item;
      }),
      edges,
    ),
    groups: ZONES.map((id) => createGroup({ id, kind: "region", label: id })),
  };
};

const targets = (shape: Shape): string[] => [
  ...(shape.balanced ? ["lb"] : []),
  ...Array.from({ length: shape.tiers }, (_, tier) => `tier-${tier}`),
  ...(shape.cache ? ["cache"] : []),
  "db",
  ...(shape.queue ? ["jobs", "worker"] : []),
];

const faultsFor = (shape: Shape) =>
  fc.array(
    fc.oneof(
      fc.record({
        kind: fc.constant("node-down" as const),
        nodeId: fc.constantFrom(...targets(shape)),
        at: fc.integer({ min: 0, max: 200 }),
        until: fc.integer({ min: 210, max: 300 }),
      }),
      fc.record({
        kind: fc.constant("capacity" as const),
        nodeId: fc.constantFrom(...targets(shape)),
        at: fc.integer({ min: 0, max: 200 }),
        factor: fc.double({ min: 0.05, max: 1, noNaN: true }),
      }),
      fc.record({
        kind: fc.constant("latency" as const),
        nodeId: fc.constantFrom(...targets(shape)),
        at: fc.integer({ min: 0, max: 200 }),
        addMs: fc.integer({ min: 1, max: 2_000 }),
      }),
      fc.record({
        kind: fc.constantFrom("group-down" as const, "partition" as const),
        groupId: fc.constantFrom(...ZONES),
        at: fc.integer({ min: 0, max: 200 }),
        until: fc.integer({ min: 210, max: 300 }),
      }),
      fc.record({
        kind: fc.constant("error-rate" as const),
        nodeId: fc.constantFrom(...targets(shape)),
        at: fc.integer({ min: 0, max: 200 }),
        rate: fc.double({ min: 0, max: 1, noNaN: true }),
      }),
    ),
    { maxLength: 3 },
  );

const scenarios = shapes.chain((shape) =>
  fc.record({
    shape: fc.constant(shape),
    faults: faultsFor(shape),
    spike: fc.double({ min: 0, max: 6, noNaN: true }),
  }),
);

const scenario = (faults: Fault[], spike = 1): LoadScenarioInput => ({
  kind: "load",
  durationSeconds: 300,
  traffic: spike === 1 ? [] : [{ at: 100, multiplier: spike }],
  faults,
});

const worstAvailability = (result: EvaluationResult): number =>
  Math.min(...result.steps.map((step) => step.clients.users!.availability));

const RUNS = { numRuns: 200 };
const SLOW = 30_000;

describe("the load model, on any design and scenario", () => {
  test(
    "answers finite numbers within their bounds",
    () => {
      fc.assert(
        fc.property(scenarios, ({ shape, faults, spike }) => {
          const result = evaluateLoad(build(shape), scenario(faults, spike));

          for (const step of result.steps) {
            for (const client of Object.values(step.clients)) {
              expect(client.availability).toBeGreaterThanOrEqual(0);
              expect(client.availability).toBeLessThanOrEqual(1);
              expect(Number.isFinite(client.p50)).toBe(true);
              expect(Number.isFinite(client.p99)).toBe(true);
              expect(client.p50).toBeLessThanOrEqual(client.p99 + 1e-9);
            }

            for (const [id, item] of Object.entries(step.nodes)) {
              for (const value of [
                item.reads,
                item.writes,
                item.rho,
                item.p50,
                item.p99,
              ]) {
                expect({ id, finite: Number.isFinite(value) }).toEqual({
                  id,
                  finite: true,
                });
              }

              expect(item.reads).toBeGreaterThanOrEqual(0);
              expect(item.writes).toBeGreaterThanOrEqual(0);
              expect(item.errorRate).toBeGreaterThanOrEqual(0);
              expect(item.errorRate).toBeLessThanOrEqual(1);
            }
          }
        }),
        RUNS,
      );
    },
    SLOW,
  );

  test(
    "answers the same way every time it is asked",
    () => {
      fc.assert(
        fc.property(scenarios, ({ shape, faults, spike }) => {
          const design = build(shape);
          const input = scenario(faults, spike);

          expect(evaluateLoad(design, input)).toEqual(
            evaluateLoad(design, input),
          );
        }),
        RUNS,
      );
    },
    SLOW,
  );

  test(
    "never serves fewer requests for a replica more, without retries",
    () => {
      fc.assert(
        fc.property(
          shapes.map((shape) => ({ ...shape, retries: 0 })),
          fc.integer({ min: 0, max: 2 }),
          (shape, tier) => {
            const index = Math.min(tier, shape.tiers - 1);
            const more = {
              ...shape,
              replicas: shape.replicas.map((count, at) =>
                at === index ? count + 1 : count,
              ),
            };
            const before = worstAvailability(
              evaluateLoad(build(shape), scenario([])),
            );
            const after = worstAvailability(
              evaluateLoad(build(more), scenario([])),
            );

            expect(after).toBeGreaterThanOrEqual(before - 1e-9);
          },
        ),
        RUNS,
      );
    },
    SLOW,
  );

  test(
    "never serves a smaller share when less traffic arrives, without retries",
    () => {
      fc.assert(
        fc.property(
          shapes.map((shape) => ({ ...shape, retries: 0 })),
          fc.double({ min: 0.05, max: 1, noNaN: true }),
          (shape, share) => {
            const fewer = {
              ...shape,
              rps: Math.max(1, Math.floor(shape.rps * share)),
            };
            const before = worstAvailability(
              evaluateLoad(build(shape), scenario([])),
            );
            const after = worstAvailability(
              evaluateLoad(build(fewer), scenario([])),
            );

            expect(after).toBeGreaterThanOrEqual(before - 1e-9);
          },
        ),
        RUNS,
      );
    },
    SLOW,
  );

  test(
    "never serves more of the traffic for a fault, without retries or a background consumer",
    () => {
      fc.assert(
        fc.property(scenarios, ({ shape, faults, spike }) => {
          const design = build({ ...shape, queue: false, retries: 0 });
          const calm = evaluateLoad(design, scenario([], spike));
          const broken = evaluateLoad(design, scenario(faults, spike));

          broken.steps.forEach((step, index) => {
            expect(step.clients.users!.availability).toBeLessThanOrEqual(
              calm.steps[index]!.clients.users!.availability + 1e-6,
            );
          });
        }),
        RUNS,
      );
    },
    SLOW,
  );

  test(
    "sends no node more than reaches it over its edges",
    () => {
      fc.assert(
        fc.property(scenarios, ({ shape, faults, spike }) => {
          const design = build(shape);
          const result = evaluateLoad(design, scenario(faults, spike));

          for (const step of result.steps) {
            for (const item of design.nodes) {
              if (item.kind === "client") continue;

              const arriving = design.edges
                .filter((candidate) => candidate.to === item.id)
                .reduce((sum, candidate) => {
                  const flow = step.edges[candidate.id];

                  return sum + (flow ? flow.reads + flow.writes : 0);
                }, 0);
              const received = step.nodes[item.id]!;

              expect(received.reads + received.writes).toBeLessThanOrEqual(
                arriving * (1 + 1e-9) + 1e-6,
              );
            }
          }
        }),
        RUNS,
      );
    },
    SLOW,
  );
});
