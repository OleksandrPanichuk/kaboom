import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import {
  createGroup,
  type DesignEdge,
  type DesignGraph,
  type DesignNode,
} from "../../graph";
import type { EvaluationResult } from "../result";
import { type Fault, type LoadScenarioInput, RELEASES } from "../scenario";
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
  autoscale: boolean;
  headroom: number;
  target: number;
  limiter: boolean;
  limitRps: number;
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
    minLength: 10,
    maxLength: 10,
  }),
  autoscale: fc.boolean(),
  headroom: fc.integer({ min: 0, max: 12 }),
  target: fc.double({ min: 0.3, max: 0.95, noNaN: true }),
  limiter: fc.boolean(),
  limitRps: fc.integer({ min: 100, max: 30_000 }),
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

  if (shape.limiter) {
    nodes.push(node("limiter", "rate-limiter", { limitRps: shape.limitRps }));
    call(previous, "limiter");
    previous = "limiter";
  }

  for (let tier = 0; tier < shape.tiers; tier += 1) {
    const id = `tier-${tier}`;
    const replicas = shape.replicas[tier]!;

    nodes.push(
      node(id, "service", {
        replicas,
        capacityRpsPerReplica: shape.capacity[tier]!,
        autoscale: {
          enabled: shape.autoscale,
          min: replicas,
          max: replicas + shape.headroom,
          targetUtilisation: shape.target,
        },
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
  ...(shape.limiter ? ["limiter"] : []),
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
        kind: fc.constantFrom(
          "group-down" as const,
          "partition" as const,
          "region-down" as const,
        ),
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

const expectBounded = (result: EvaluationResult) => {
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
};

const BACKLOGGED: ReadonlySet<string> = new Set(["client", "queue", "stream"]);

const expectConserved = (design: DesignGraph, result: EvaluationResult) => {
  for (const step of result.steps) {
    for (const item of design.nodes) {
      if (BACKLOGGED.has(item.kind)) continue;

      const node = step.nodes[item.id];

      if (!node) continue;

      const received = node.reads + node.writes;

      for (const outgoing of design.edges) {
        if (outgoing.from !== item.id) continue;

        const flow = step.edges[outgoing.id];

        if (!flow) continue;

        const props = outgoing.props as Partial<
          Record<"share" | "fanOut" | "retries", number>
        >;
        const most =
          received *
          Math.max(1, props.share ?? 1) *
          Math.max(1, props.fanOut ?? 1) *
          (1 + (props.retries ?? 0));

        expect({
          edge: outgoing.id,
          over: flow.reads + flow.writes > most * (1 + 1e-9) + 1e-6,
        }).toEqual({
          edge: outgoing.id,
          over: false,
        });
      }
    }
  }
};

interface Kube {
  rps: number;
  replicas: number;
  capacity: number;
  strategy: "rolling" | "recreate" | "blue-green" | "canary";
  readiness: boolean;
  liveness: boolean;
  maxSurge: number;
  maxUnavailable: number;
  startupSeconds: number;
  progressDeadlineSeconds: number;
  canarySeconds: number;
  hpa: boolean;
  hpaMax: number;
  retries: number;
}

const kubes = fc.record({
  rps: fc.integer({ min: 10, max: 20_000 }),
  replicas: fc.integer({ min: 1, max: 10 }),
  capacity: fc.integer({ min: 100, max: 5_000 }),
  strategy: fc.constantFrom(
    "rolling" as const,
    "recreate" as const,
    "blue-green" as const,
    "canary" as const,
  ),
  readiness: fc.boolean(),
  liveness: fc.boolean(),
  maxSurge: fc.integer({ min: 0, max: 3 }),
  maxUnavailable: fc.integer({ min: 0, max: 3 }),
  startupSeconds: fc.integer({ min: 0, max: 120 }),
  progressDeadlineSeconds: fc.integer({ min: 30, max: 600 }),
  canarySeconds: fc.integer({ min: 10, max: 300 }),
  hpa: fc.boolean(),
  hpaMax: fc.integer({ min: 1, max: 20 }),
  retries: fc.integer({ min: 0, max: 2 }),
});

const buildKube = (shape: Kube): DesignGraph => {
  const nodes: DesignNode[] = [
    node("users", "client", { rps: shape.rps, readRatio: 0.9 }),
    node("ingress", "ingress"),
    node("svc", "k8s-service"),
    node("app", "k8s-deployment", {
      replicas: shape.replicas,
      capacityRpsPerReplica: shape.capacity,
      strategy: shape.strategy,
      readinessProbe: shape.readiness,
      livenessProbe: shape.liveness,
      maxSurge: shape.maxSurge,
      maxUnavailable: shape.maxUnavailable,
      startupSeconds: shape.startupSeconds,
      progressDeadlineSeconds: shape.progressDeadlineSeconds,
      canarySeconds: shape.canarySeconds,
    }),
    node("db", "sql-database"),
  ];
  const edges: DesignEdge[] = [
    edge("users", "ingress"),
    edge("ingress", "svc"),
    edge("svc", "app", "sync-call", { retries: shape.retries }),
    edge("app", "db", "sync-call", { retries: shape.retries }),
  ];

  if (shape.hpa) {
    nodes.push(
      node("hpa", "hpa", {
        min: shape.replicas,
        max: shape.replicas + shape.hpaMax,
      }),
    );
    edges.push(edge("hpa", "app", "scales"));
  }

  return graph(nodes, edges);
};

const rollouts = kubes.chain((shape) =>
  fc.record({
    shape: fc.constant(shape),
    faults: fc.array(
      fc.oneof(
        fc.record({
          kind: fc.constant("rollout" as const),
          nodeId: fc.constant("app"),
          at: fc.integer({ min: 0, max: 400 }),
          release: fc.constantFrom(...RELEASES),
          migrates: fc.boolean(),
        }),
        fc.record({
          kind: fc.constant("node-down" as const),
          nodeId: fc.constantFrom("ingress", "svc", "app", "db"),
          at: fc.integer({ min: 0, max: 400 }),
          until: fc.integer({ min: 410, max: 600 }),
        }),
        fc.record({
          kind: fc.constant("capacity" as const),
          nodeId: fc.constantFrom("app", "db"),
          at: fc.integer({ min: 0, max: 400 }),
          factor: fc.double({ min: 0.05, max: 1, noNaN: true }),
        }),
      ),
      { maxLength: 3 },
    ),
    spike: fc.double({ min: 0, max: 4, noNaN: true }),
  }),
);

const long = (faults: Fault[], spike = 1): LoadScenarioInput => ({
  kind: "load",
  durationSeconds: 900,
  traffic: spike === 1 ? [] : [{ at: 200, multiplier: spike }],
  faults,
});
const SLOW = 30_000;

describe("the load model, on any design and scenario", () => {
  test(
    "answers finite numbers within their bounds",
    () => {
      fc.assert(
        fc.property(scenarios, ({ shape, faults, spike }) => {
          expectBounded(evaluateLoad(build(shape), scenario(faults, spike)));
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
    "forwards no more than a node receives, times its edge's share, fan-out and retries",
    () => {
      fc.assert(
        fc.property(scenarios, ({ shape, faults, spike }) => {
          const design = build(shape);
          const result = evaluateLoad(design, scenario(faults, spike));

          expectConserved(design, result);
        }),
        RUNS,
      );
    },
    SLOW,
  );
});

describe("the load model, on Kubernetes designs with rollouts", () => {
  test(
    "answers finite numbers within their bounds, and forwards no more than a node receives",
    () => {
      fc.assert(
        fc.property(rollouts, ({ shape, faults, spike }) => {
          const design = buildKube(shape);
          const result = evaluateLoad(design, long(faults, spike));

          expectBounded(result);
          expectConserved(design, result);
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
        fc.property(rollouts, ({ shape, faults, spike }) => {
          const design = buildKube(shape);

          expect(evaluateLoad(design, long(faults, spike))).toEqual(
            evaluateLoad(design, long(faults, spike)),
          );
        }),
        RUNS,
      );
    },
    SLOW,
  );

  test(
    "never serves from more pods than the autoscaler allows, plus what a rollout may add",
    () => {
      fc.assert(
        fc.property(rollouts, ({ shape, faults, spike }) => {
          const design = buildKube({ ...shape, hpa: true });
          const result = evaluateLoad(design, long(faults, spike));
          const ceiling =
            shape.replicas + shape.hpaMax + Math.max(shape.maxSurge, 1);

          for (const step of result.steps) {
            const replicas = step.nodes.app?.replicas;

            if (replicas === undefined) continue;

            expect(replicas).toBeLessThanOrEqual(ceiling);
          }
        }),
        RUNS,
      );
    },
    SLOW,
  );
});
