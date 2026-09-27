import { catalogue } from "../../catalogue";
import type { DesignEdge, DesignGraph, DesignNode } from "../../graph";
import type {
  ClientStep,
  EdgeStep,
  EvaluationResult,
  EvaluationStep,
  NodeStep,
} from "../result";
import {
  type LoadScenario,
  type LoadScenarioInput,
  LoadScenarioSchema,
  MAX_STEPS,
} from "../scenario";
import { type FaultState, faultStateAt } from "./conditions";
import { FindingLog, percent, perSecond, round } from "./findings";
import {
  baseLatencyOf,
  capacityOf,
  carries,
  type Channels,
  consumerLimit,
  forwardedBy,
  SATURATION,
  SYNCHRONOUS,
  utilisation,
} from "./node-model";
import { type Topology, topology } from "./topology";

const DEFAULT_TIMEOUT_MS = 1_000;
const ERROR_FINDING = 0.01;
const GROWTH_STEPS = 3;

const zero = (): Channels => ({ reads: 0, writes: 0 });

const add = (a: Channels, b: Channels): Channels => ({
  reads: a.reads + b.reads,
  writes: a.writes + b.writes,
});

const scaleBy = (a: Channels, factor: number): Channels => ({
  reads: a.reads * factor,
  writes: a.writes * factor,
});

const total = (a: Channels) => a.reads + a.writes;

const multiplierAt = (scenario: LoadScenario, t: number): number => {
  let multiplier = 1;

  for (const point of [...scenario.traffic].sort((a, b) => a.at - b.at)) {
    if (point.at <= t) multiplier = point.multiplier;
  }

  return multiplier;
};

const autoscaled = (node: DesignNode) =>
  (node.kind === "service" || node.kind === "worker") &&
  node.props.autoscale.enabled
    ? node.props.autoscale
    : null;

const initialReplicas = (node: DesignNode): number =>
  node.kind === "service" || node.kind === "worker" ? node.props.replicas : 1;

interface Memory {
  replicas: Map<string, number>;
  aboveStreak: Map<string, number>;
  backlog: Map<string, number>;
  growth: Map<string, number>;
  readShare: Map<string, number>;
}

export const evaluateLoad = (
  graph: DesignGraph,
  input: LoadScenarioInput,
): EvaluationResult => {
  const scenario = LoadScenarioSchema.parse(input);
  const count = Math.min(
    MAX_STEPS,
    Math.max(1, Math.floor(scenario.durationSeconds / scenario.stepSeconds)),
  );
  const topo = topology(graph);
  const log = new FindingLog();
  const memory: Memory = {
    replicas: new Map(
      graph.nodes.map((node) => [node.id, initialReplicas(node)]),
    ),
    aboveStreak: new Map(),
    backlog: new Map(),
    growth: new Map(),
    readShare: new Map(),
  };
  const steps: EvaluationStep[] = [];

  for (let index = 0; index < count; index++) {
    steps.push(runStep(topo, scenario, memory, log, index));
  }

  return { steps, findings: log.list() };
};

const runStep = (
  topo: Topology,
  scenario: LoadScenario,
  memory: Memory,
  log: FindingLog,
  index: number,
): EvaluationStep => {
  const t = index * scenario.stepSeconds;
  const multiplier = multiplierAt(scenario, t);
  const state = new Map<string, FaultState>();

  for (const node of topo.order) {
    state.set(
      node.id,
      faultStateAt(
        node,
        scenario.faults,
        topo.replicasOf.get(node.id)?.length ?? 0,
        t,
      ),
    );
  }

  const isUp = (id: string) => !(state.get(id)?.down ?? false);

  const conditionsOf = (node: DesignNode) => {
    const fault = state.get(node.id)!;
    const replicaIds = topo.replicasOf.get(node.id) ?? [];
    const upReplicas = Math.max(
      0,
      replicaIds.filter(isUp).length - (fault.promoted ? 1 : 0),
    );

    return {
      capacityFactor: fault.capacityFactor,
      replicas: memory.replicas.get(node.id) ?? 1,
      upReplicas,
      hitRatio: fault.hitRatio ?? 0,
    };
  };

  const received = new Map<string, Channels>();
  const edges: Record<string, EdgeStep> = {};
  const nodes: Record<string, NodeStep> = {};
  const emitted = new Map<string, number>();

  const send = (edge: DesignEdge, flow: Channels, backlog?: number) => {
    edges[edge.id] = {
      reads: flow.reads,
      writes: flow.writes,
      ...(backlog !== undefined ? { backlog } : {}),
    };
    received.set(edge.to, add(received.get(edge.to) ?? zero(), flow));
  };

  for (const node of topo.order) {
    const conditions = conditionsOf(node);
    const fault = state.get(node.id)!;
    const up = !fault.down;
    const outgoing = topo.outbound.get(node.id) ?? [];
    let load = received.get(node.id) ?? zero();

    if (node.kind === "client") {
      const rps = node.props.rps * multiplier;

      load = {
        reads: rps * node.props.readRatio,
        writes: rps * (1 - node.props.readRatio),
      };
      emitted.set(node.id, rps);
    }

    const capacity = capacityOf(node, conditions);
    const rho = up
      ? utilisation(load, capacity)
      : total(load) > 0
        ? Number.POSITIVE_INFINITY
        : 0;
    const servedFraction = !up ? 0 : rho <= SATURATION ? 1 : SATURATION / rho;
    const served = scaleBy(load, servedFraction);
    const unanswered =
      node.kind === "client" && outgoing.length === 0 && total(load) > 0;
    const ownErrorRate = !up || unanswered ? 1 : 1 - servedFraction;

    const inboundTimeouts = (topo.inbound.get(node.id) ?? []).map(
      (edge) => edge.props.timeoutMs,
    );
    const timeout =
      inboundTimeouts.length > 0
        ? Math.max(...inboundTimeouts)
        : DEFAULT_TIMEOUT_MS;
    const base = baseLatencyOf(node) + fault.addLatencyMs;
    const pinned = !up || rho >= SATURATION;
    const p50 = pinned ? timeout : base / (1 - rho);
    const p99 = pinned ? timeout : p50 * (1 + rho);

    const step: NodeStep = {
      reads: load.reads,
      writes: load.writes,
      rho,
      p50,
      p99,
      ownErrorRate,
      errorRate: ownErrorRate,
      up,
      ...(autoscaled(node) || node.kind === "service" || node.kind === "worker"
        ? { replicas: conditions.replicas }
        : {}),
    };

    if (node.kind === "queue" || node.kind === "stream") {
      const accepted = served;
      const inTotal = total(accepted);
      const share =
        inTotal > 0
          ? accepted.reads / inTotal
          : (memory.readShare.get(node.id) ?? 1);

      memory.readShare.set(node.id, share);

      const split = (messages: number): Channels => ({
        reads: messages * share,
        writes: messages * (1 - share),
      });

      const limitOf = (edge: DesignEdge) => {
        const target = topo.byId.get(edge.to)!;

        return isUp(target.id)
          ? consumerLimit(capacityOf(target, conditionsOf(target)))
          : 0;
      };

      if (node.kind === "queue") {
        const backlog = memory.backlog.get(node.id) ?? 0;
        const limits = outgoing.map(limitOf);
        const consumerCapacity = limits.reduce((sum, value) => sum + value, 0);
        const drained = Math.min(
          backlog / scenario.stepSeconds + inTotal,
          consumerCapacity,
        );
        const next = Math.max(
          0,
          backlog + (inTotal - drained) * scenario.stepSeconds,
        );

        outgoing.forEach((edge, position) => {
          const portion =
            consumerCapacity > 0 ? limits[position]! / consumerCapacity : 0;

          send(edge, scaleBy(split(drained * portion), edge.props.fanOut));
        });
        noteBacklog(
          log,
          memory,
          index,
          { type: "node", id: node.id },
          backlog,
          next,
          inTotal,
          drained,
          node.label || node.id,
        );
        memory.backlog.set(node.id, next);
        step.backlog = next;
      } else {
        for (const edge of outgoing) {
          const key = `edge:${edge.id}`;
          const backlog = memory.backlog.get(key) ?? 0;
          const drained = Math.min(
            backlog / scenario.stepSeconds + inTotal,
            limitOf(edge),
          );
          const next = Math.max(
            0,
            backlog + (inTotal - drained) * scenario.stepSeconds,
          );

          send(edge, scaleBy(split(drained), edge.props.fanOut), next);
          noteBacklog(
            log,
            memory,
            index,
            { type: "edge", id: edge.id },
            backlog,
            next,
            inTotal,
            drained,
            `${node.label || node.id} → ${topo.byId.get(edge.to)?.label ?? edge.to}`,
          );
          memory.backlog.set(key, next);
        }

        step.backlog = Math.max(
          0,
          ...outgoing.map((edge) => memory.backlog.get(`edge:${edge.id}`) ?? 0),
        );
      }
    } else {
      const forwarded = forwardedBy(node, served, conditions.hitRatio);
      const { distribution } = catalogue[node.kind];
      const healthChecked =
        node.kind !== "load-balancer" || node.props.healthCheck;

      for (const channel of ["reads", "writes"] as const) {
        const carrying = outgoing.filter((edge) => carries(edge.kind)[channel]);
        const targets = healthChecked
          ? carrying.filter((edge) => isUp(edge.to))
          : carrying;

        for (const edge of carrying) {
          const portion =
            distribution === "evenly"
              ? targets.includes(edge)
                ? 1 / targets.length
                : 0
              : distribution === "broadcast"
                ? 1
                : edge.props.share;
          const amount = forwarded[channel] * portion * edge.props.fanOut;
          const previous = edges[edge.id] ?? { reads: 0, writes: 0 };

          edges[edge.id] = { ...previous, [channel]: amount };
        }
      }

      for (const edge of outgoing) {
        const flow = edges[edge.id] ?? { reads: 0, writes: 0 };

        received.set(edge.to, add(received.get(edge.to) ?? zero(), flow));
      }
    }

    nodes[node.id] = step;
  }

  for (const [replicaId, primaryId] of topo.primaryOf) {
    const primary = nodes[primaryId];
    const replica = nodes[replicaId];

    if (!primary || !replica || (topo.inbound.get(replicaId)?.length ?? 0) > 0)
      continue;

    const node = topo.byId.get(primaryId)!;
    const capacity = capacityOf(node, conditionsOf(node));
    const readRho =
      primary.reads === 0 ? 0 : primary.reads / (capacity.reads || 1);

    nodes[replicaId] = { ...replica, rho: replica.up ? readRho : 0 };
  }

  for (const node of [...topo.order].reverse()) {
    const step = nodes[node.id]!;
    const served = (step.reads + step.writes) * (1 - step.ownErrorRate);
    const calls = (topo.outbound.get(node.id) ?? [])
      .filter((edge) => SYNCHRONOUS.has(edge.kind))
      .map((edge) => {
        const flow = edges[edge.id];

        return {
          weight: flow && served > 0 ? total(flow) / served : 0,
          errorRate: nodes[edge.to]?.errorRate ?? 0,
        };
      })
      .filter((call) => call.weight > 0);
    const weights = calls.reduce((sum, call) => sum + call.weight, 0);
    const downstream =
      weights <= 1 + 1e-9
        ? calls.reduce((sum, call) => sum + call.weight * call.errorRate, 0)
        : 1 -
          calls.reduce(
            (product, call) =>
              product * (1 - Math.min(1, call.weight) * call.errorRate),
            1,
          );

    step.errorRate = Math.min(
      1,
      step.ownErrorRate + (1 - step.ownErrorRate) * downstream,
    );
  }

  const pathLatency = new Map<string, { p50: number; p99: number }>();

  for (const node of [...topo.order].reverse()) {
    const step = nodes[node.id]!;
    let slowest = { p50: 0, p99: 0 };

    for (const edge of topo.outbound.get(node.id) ?? []) {
      const flow = edges[edge.id];

      if (!SYNCHRONOUS.has(edge.kind) || !flow || total(flow) === 0) continue;

      const below = pathLatency.get(edge.to);

      if (below && below.p99 > slowest.p99) slowest = below;
    }

    pathLatency.set(node.id, {
      p50: step.p50 + slowest.p50,
      p99: step.p99 + slowest.p99,
    });
  }

  const clients: Record<string, ClientStep> = {};

  for (const node of topo.order) {
    if (node.kind !== "client") continue;

    const rps = emitted.get(node.id) ?? 0;
    const availability = 1 - nodes[node.id]!.errorRate;
    const path = pathLatency.get(node.id)!;

    clients[node.id] = {
      emitted: rps,
      served: rps * availability,
      availability,
      p50: path.p50,
      p99: path.p99,
    };

    if (
      rps > 0 &&
      (path.p99 > scenario.slo.p99Ms ||
        availability < scenario.slo.availability)
    ) {
      const label = node.label || node.id;
      const latencyMiss = path.p99 > scenario.slo.p99Ms;

      log.note(index, {
        target: { type: "node", id: node.id },
        kind: "slo-breach",
        message: latencyMiss
          ? `${label} sees p99 ${round(path.p99, 0)} ms against a ${scenario.slo.p99Ms} ms target.`
          : `${label} gets ${percent(availability)} of its requests served against a ${percent(scenario.slo.availability)} target.`,
        data: {
          p99: round(path.p99),
          availability: round(availability, 5),
          targetP99: scenario.slo.p99Ms,
          targetAvailability: scenario.slo.availability,
        },
        worst: latencyMiss ? path.p99 : 1 - availability,
      });
    }
  }

  for (const node of topo.order) {
    const step = nodes[node.id]!;
    const label = node.label || node.id;
    const lambda = step.reads + step.writes;

    if (step.up && step.rho >= SATURATION && lambda > 0) {
      const capacity = capacityOf(node, conditionsOf(node));

      log.note(index, {
        target: { type: "node", id: node.id },
        kind: "saturated",
        message: `${label} is at ${percent(step.rho)} of its capacity: it receives ${perSecond(lambda)}.`,
        data: {
          rho: round(step.rho),
          lambda: round(lambda),
          readCapacity: round(capacity.reads),
          writeCapacity: round(capacity.writes),
        },
        worst: step.rho,
      });
    }

    if (step.ownErrorRate > ERROR_FINDING && lambda > 0) {
      log.note(index, {
        target: { type: "node", id: node.id },
        kind: "errors",
        message: step.up
          ? `${label} fails ${percent(step.ownErrorRate)} of what it receives: it cannot serve ${perSecond(lambda * step.ownErrorRate)} of ${perSecond(lambda)}.`
          : `${label} is down and fails all ${perSecond(lambda)} it receives.`,
        data: { errorRate: round(step.ownErrorRate, 5), lambda: round(lambda) },
        worst: step.ownErrorRate,
      });
    }

    const policy = autoscaled(node);

    if (policy) {
      const streak =
        step.rho > policy.targetUtilisation
          ? (memory.aboveStreak.get(node.id) ?? 0) + 1
          : 0;
      const replicas = memory.replicas.get(node.id) ?? 1;

      if (streak >= 2 && replicas < policy.max) {
        memory.replicas.set(
          node.id,
          Math.min(policy.max, replicas + Math.ceil(replicas * 0.5)),
        );
        memory.aboveStreak.set(node.id, 0);
      } else {
        memory.aboveStreak.set(node.id, streak);
      }
    }
  }

  return { t, nodes, edges, clients };
};

const noteBacklog = (
  log: FindingLog,
  memory: Memory,
  index: number,
  target: { type: "node" | "edge"; id: string },
  before: number,
  after: number,
  inflow: number,
  drained: number,
  label: string,
) => {
  const key = `growth:${target.type}:${target.id}`;
  const streak = after > before + 1e-9 ? (memory.growth.get(key) ?? 0) + 1 : 0;

  memory.growth.set(key, streak);

  if (streak >= GROWTH_STEPS) {
    log.note(index, {
      target,
      kind: "backlog-growing",
      message: `${label} falls behind: ${perSecond(inflow)} arrive and ${perSecond(drained)} are consumed, so ${round(after, 0).toLocaleString("en")} messages wait.`,
      data: {
        backlog: round(after),
        inflow: round(inflow),
        drained: round(drained),
      },
      worst: after,
    });
  }
};
