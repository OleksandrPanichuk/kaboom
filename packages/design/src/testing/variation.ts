import { catalogue, describeProps } from "../catalogue";
import type { LoadScenarioInput } from "../evaluate/scenario";
import type { DesignGraph, DesignNode } from "../graph";
import type { Assertion } from "./assertion";

export const VARIATION = {
  trafficNoise: 0.05,
  burstMultiplier: [1.05, 1.15],
  burstSeconds: 30,
  onsetShiftSeconds: 30,
  durationFactor: [0.75, 1.25],
  capacityNoise: 0.05,
  latencyFactor: [0.95, 1.15],
} as const;

type TrafficPoint = NonNullable<LoadScenarioInput["traffic"]>[number];
type Fault = NonNullable<LoadScenarioInput["faults"]>[number];

const MAX_TRAFFIC_POINTS = 100;
const MINUTE = 60;

export const random = (seed: number) => {
  let state = seed >>> 0 || 1;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;

    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const between = (next: () => number, [low, high]: readonly [number, number]) =>
  low + (high - low) * next();

const multiplierAt = (traffic: readonly TrafficPoint[], t: number): number =>
  [...traffic]
    .sort((a, b) => a.at - b.at)
    .reduce(
      (current, point) => (point.at <= t ? point.multiplier : current),
      1,
    );

const variedTraffic = (
  traffic: readonly TrafficPoint[],
  durationSeconds: number,
  next: () => number,
): TrafficPoint[] => {
  const burstAt = Math.floor(
    next() * Math.max(0, durationSeconds - VARIATION.burstSeconds),
  );
  const burst = between(next, VARIATION.burstMultiplier);
  const marks = new Set<number>([burstAt, burstAt + VARIATION.burstSeconds]);

  for (let t = 0; t < durationSeconds; t += MINUTE) marks.add(t);
  for (const point of traffic) marks.add(point.at);

  const noise = new Map<number, number>();

  for (let t = 0; t < durationSeconds; t += MINUTE) {
    noise.set(t, 1 + (next() * 2 - 1) * VARIATION.trafficNoise);
  }

  const noiseAt = (t: number) =>
    noise.get(Math.floor(t / MINUTE) * MINUTE) ?? 1;

  return [...marks]
    .filter((t) => t < durationSeconds)
    .sort((a, b) => a - b)
    .slice(0, MAX_TRAFFIC_POINTS)
    .map((t) => ({
      at: t,
      multiplier:
        multiplierAt(traffic, t) *
        noiseAt(t) *
        (t >= burstAt && t < burstAt + VARIATION.burstSeconds ? burst : 1),
    }));
};

const variedFault = (fault: Fault, next: () => number): Fault => {
  const shift = Math.round((next() * 2 - 1) * VARIATION.onsetShiftSeconds);
  const at = Math.max(0, fault.at + shift);

  if (!("until" in fault) || fault.until === undefined) return { ...fault, at };

  const length = Math.max(
    10,
    Math.round(
      (fault.until - fault.at) * between(next, VARIATION.durationFactor),
    ),
  );

  return { ...fault, at, until: at + length };
};

const variedNode = (node: DesignNode, next: () => number): DesignNode => {
  if (node.kind === "client") return node;

  const capacity = 1 + (next() * 2 - 1) * VARIATION.capacityNoise;
  const latency = between(next, VARIATION.latencyFactor);
  const props = { ...(node.props as Record<string, unknown>) };

  for (const field of describeProps(catalogue[node.kind].props)) {
    const value = props[field.key];

    if (typeof value !== "number") continue;

    if (
      (field.meta.unit === "req/s" || field.meta.unit === "msg/s") &&
      !/limit/i.test(field.key)
    ) {
      props[field.key] = value * capacity;
    }

    if (field.key === "baseLatencyMs") props[field.key] = value * latency;
  }

  return { ...node, props } as DesignNode;
};

export const vary = (
  graph: DesignGraph,
  scenario: LoadScenarioInput,
  seed: number,
  { faults = true }: { faults?: boolean } = {},
): { graph: DesignGraph; scenario: LoadScenarioInput } => {
  if (seed === 0) return { graph, scenario };

  const next = random(seed);
  const durationSeconds = scenario.durationSeconds ?? 600;

  return {
    graph: {
      ...graph,
      nodes: graph.nodes.map((node) => variedNode(node, next)),
    },
    scenario: {
      ...scenario,
      traffic: variedTraffic(scenario.traffic ?? [], durationSeconds, next),
      faults: (scenario.faults ?? []).map((fault) => {
        const shifted = variedFault(fault, next);

        return faults ? shifted : fault;
      }),
    },
  };
};

export const HOLDS_SHARE = 0.95;
export const CHAOS_SEEDS = 5;
export const VARIATION_BUDGET = 600_000;

export interface Variation {
  passed: number;
  total: number;
  worstSeed: number | null;
  worst: Assertion | null;
}

export type VariedStatus = "passed" | "failed" | "flaky";

export const statusOf = (
  nominal: boolean,
  variation: Variation | null,
): VariedStatus => {
  if (!nominal) return "failed";
  if (!variation || variation.total === 0) return "passed";

  return variation.passed / variation.total >= HOLDS_SHARE ? "passed" : "flaky";
};

export const runCost = (graph: DesignGraph, scenario: LoadScenarioInput) =>
  Math.max(1, graph.nodes.length) *
  Math.ceil((scenario.durationSeconds ?? 600) / (scenario.stepSeconds ?? 10));

export const budget = (total = VARIATION_BUDGET) => {
  let remaining = total;

  return {
    seedsFor: (wanted: number, cost: number) => {
      const affordable = Math.min(wanted, Math.floor(remaining / cost));

      remaining -= Math.max(0, affordable) * cost;

      return Math.max(0, affordable);
    },
  };
};

export const varied = (
  seeds: number,
  run: (seed: number) => { passed: boolean; assertions: Assertion[] },
): Variation => {
  let passed = 0;
  let worstSeed: number | null = null;
  let worst: Assertion | null = null;

  for (let seed = 1; seed <= seeds; seed++) {
    const outcome = run(seed);

    if (outcome.passed) {
      passed += 1;
    } else if (worstSeed === null) {
      worstSeed = seed;
      worst = outcome.assertions.find((item) => !item.passed) ?? null;
    }
  }

  return { passed, total: seeds, worstSeed, worst };
};
