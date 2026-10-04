import { catalogue } from "../../catalogue";
import type { DesignEdge, DesignGraph, DesignNode } from "../../graph";
import type {
  ClientStep,
  EdgeStep,
  EvaluationResult,
  EvaluationStep,
  NodeStep,
  RolloutStep,
} from "../result";
import {
  type LoadScenario,
  type LoadScenarioInput,
  LoadScenarioSchema,
  MAX_STEPS,
} from "../scenario";
import { evaluateAlerts } from "./alerts";
import { active, type FaultState, faultStateAt } from "./conditions";
import { FindingLog, percent, perSecond, round } from "./findings";
import {
  baseLatencyOf,
  capacityOf,
  carries,
  type Channels,
  consumerLimit,
  feedsOnlyChanges,
  forwardedBy,
  intrinsicErrorRateOf,
  SATURATION,
  SYNCHRONOUS,
  throttleLimitOf,
  utilisation,
} from "./node-model";
import {
  advanceRollout,
  CRASH_LOOP_RESTARTS,
  inheritedFailure,
  type Rollout,
  rolloutStepAt,
  servingPods,
  SLOWDOWN,
  startRollout,
} from "./rollout";
import { type Topology, topology } from "./topology";

const DEFAULT_TIMEOUT_MS = 1_000;
export const CROSS_REGION_MS = 70;
const ERROR_FINDING = 0.01;
const GROWTH_STEPS = 3;
const SLOW_TAIL = 0.01;

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

const burstShare = (
  every: number,
  burst: number,
  from: number,
  length: number,
): number => {
  let covered = 0;

  for (
    let start = Math.floor(from / every) * every;
    start < from + length;
    start += every
  ) {
    covered += Math.max(
      0,
      Math.min(start + burst, from + length) - Math.max(start, from),
    );
  }

  return covered / length;
};

interface ScalingPolicy {
  min: number;
  max: number;
  targetUtilisation: number;
}

const autoscaled = (topo: Topology, node: DesignNode): ScalingPolicy | null => {
  if (node.kind === "service" || node.kind === "worker") {
    return node.props.autoscale.enabled ? node.props.autoscale : null;
  }

  if (node.kind === "k8s-deployment") {
    const scaler = topo.byId.get(topo.scalerOf.get(node.id) ?? "");

    return scaler?.kind === "hpa" ? scaler.props : null;
  }

  return null;
};

const reportsReplicas = (node: DesignNode): boolean =>
  node.kind === "service" ||
  node.kind === "worker" ||
  node.kind === "scheduler" ||
  node.kind === "k8s-deployment";

const initialReplicas = (topo: Topology, node: DesignNode): number => {
  if (node.kind === "k8s-deployment") {
    const policy = autoscaled(topo, node);

    return policy
      ? Math.min(policy.max, Math.max(policy.min, node.props.replicas))
      : node.props.replicas;
  }

  return node.kind === "service" ||
    node.kind === "worker" ||
    node.kind === "scheduler"
    ? node.props.replicas
    : 1;
};

interface Memory {
  replicas: Map<string, number>;
  aboveStreak: Map<string, number>;
  backlog: Map<string, number>;
  growth: Map<string, number>;
  lastError: Map<string, number>;
  lastPersistent: Map<string, number>;
  readShare: Map<string, number>;
  downSince: Map<string, number>;
  rollouts: Map<string, Rollout>;
  triggersStarted: Map<string, number>;
}

const VOLUME_SYNC_SECONDS = 60;

const RETRY_STORM_FACTOR = 1.5;
const MAX_REPORTED_RHO = 10;

const RETRY_P99_SHARE = 0.01;

const RETRY_P50_SHARE = 0.5;

const partitionsAt = (
  topo: Topology,
  scenario: LoadScenario,
  t: number,
): Map<string, number> => {
  const cut = new Map<string, number>();

  for (const fault of scenario.faults) {
    if (fault.kind !== "partition" || !active(fault, t)) continue;

    const inside = (id: string) =>
      (topo.groupsOf.get(id) ?? []).includes(fault.groupId);

    for (const edge of topo.edges) {
      if (inside(edge.from) !== inside(edge.to)) {
        cut.set(edge.id, Math.min(cut.get(edge.id) ?? fault.at, fault.at));
      }
    }
  }

  return cut;
};

const rotationOf = (
  topo: Topology,
  scenario: LoadScenario,
  node: Extract<DesignNode, { kind: "k8s-deployment" }>,
  t: number,
): { at: number; revokeAt: number } | null => {
  const mounted = new Map(
    (topo.mountsOf.get(node.id) ?? []).flatMap((id) => {
      const secret = topo.byId.get(id);

      return secret?.kind === "secret" ? [[id, secret] as const] : [];
    }),
  );
  const fault = scenario.faults
    .filter(
      (item) =>
        item.kind === "secret-rotation" &&
        mounted.has(item.nodeId) &&
        item.at <= t,
    )
    .sort((a, b) => a.at - b.at)[0];

  if (fault?.kind !== "secret-rotation") return null;

  const secret = mounted.get(fault.nodeId)!;

  return { at: fault.at, revokeAt: fault.at + secret.props.overlapSeconds };
};

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
      graph.nodes.map((node) => [node.id, initialReplicas(topo, node)]),
    ),
    aboveStreak: new Map(),
    backlog: new Map(),
    growth: new Map(),
    readShare: new Map(),
    downSince: new Map(),
    lastError: new Map(),
    lastPersistent: new Map(),
    rollouts: new Map(),
    triggersStarted: new Map(),
  };
  const steps: EvaluationStep[] = [];

  for (let index = 0; index < count; index++) {
    steps.push(runStep(topo, scenario, memory, log, index));
  }

  const paged = evaluateAlerts(graph, scenario, steps);

  return {
    steps,
    findings: [...log.list(), ...paged.findings].sort(
      (a, b) => a.atStep - b.atStep,
    ),
    alerts: paged.alerts,
  };
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
        {
          groups: topo.groupsOf.get(node.id) ?? [],
          replicaGroups: (topo.replicasOf.get(node.id) ?? []).map(
            (id) => topo.groupsOf.get(id) ?? [],
          ),
        },
        t,
      ),
    );
  }

  const isUp = (id: string) => !(state.get(id)?.down ?? false);
  const cutSince = partitionsAt(topo, scenario, t);
  const isCut = (edge: DesignEdge) => cutSince.has(edge.id);
  const attempts = new Map<string, number>();
  const stranded = new Map<string, number>();
  const persistent = new Map<string, number>();
  const attemptsOf = (edge: DesignEdge): number => {
    const retries = SYNCHRONOUS.has(edge.kind) ? edge.props.retries : 0;

    if (retries === 0) return 1;

    const { lasting, transient } = isCut(edge)
      ? { lasting: 1, transient: 0 }
      : split(
          memory.lastError.get(edge.to) ?? 0,
          memory.lastPersistent.get(edge.to) ?? 0,
        );
    let sum = 1;

    for (let attempt = 1; attempt <= retries; attempt++) {
      sum += lasting + (1 - lasting) * transient ** attempt;
    }

    return sum;
  };

  for (const node of topo.order) {
    if (isUp(node.id)) memory.downSince.delete(node.id);
    else if (!memory.downSince.has(node.id)) memory.downSince.set(node.id, t);
  }

  const rollouts = new Map<string, RolloutStep>();
  const staleShares = new Map<string, number>();

  for (const node of topo.order) {
    if (node.kind !== "k8s-deployment") continue;

    const rotation = rotationOf(topo, scenario, node, t);
    const restarts =
      rotation !== null &&
      node.props.secretDelivery === "env" &&
      node.props.restartOnSecretChange;
    const triggers = [
      ...scenario.faults.flatMap((fault) =>
        fault.kind === "rollout" && fault.nodeId === node.id && fault.at <= t
          ? [
              {
                at: fault.at,
                release: fault.release,
                migrates: fault.migrates,
                rotates: false,
              },
            ]
          : [],
      ),
      ...(restarts
        ? [
            {
              at: rotation.at,
              release: "healthy" as const,
              migrates: false,
              rotates: true,
            },
          ]
        : []),
    ].sort((a, b) => a.at - b.at);
    const started = memory.triggersStarted.get(node.id) ?? 0;
    const previous = memory.rollouts.get(node.id);
    const next = triggers[started];
    let rollout = previous;

    if (next && previous?.phase !== "rolling") {
      const oldFailure =
        next.migrates && node.props.schemaChanges === "breaking"
          ? { from: t, cause: "migration" as const }
          : rotation && (next.rotates || (!restarts && rotation.at <= next.at))
            ? { from: rotation.revokeAt, cause: "rotation" as const }
            : previous
              ? inheritedFailure(previous, node.props, t)
              : null;

      rollout = startRollout(
        next.release,
        t,
        memory.replicas.get(node.id) ?? 1,
        oldFailure,
      );
      memory.triggersStarted.set(node.id, started + 1);
    }

    if (rotation && !restarts) {
      const pickedUp =
        node.props.secretDelivery === "volume"
          ? rotation.at + VOLUME_SYNC_SECONDS
          : null;
      const refreshed =
        rollout !== undefined &&
        rollout.startedAt >= rotation.at &&
        rollout.oldFailureCause === "rotation";
      const stale =
        !refreshed &&
        t >= rotation.revokeAt &&
        (pickedUp === null || t < pickedUp);

      staleShares.set(node.id, stale ? 1 : 0);
    }

    if (!rollout) continue;

    memory.rollouts.set(node.id, rollout);
    advanceRollout(rollout, node.props, t);
    rollouts.set(node.id, rolloutStepAt(rollout, node.props, t));
  }

  const rolloutShape = (node: DesignNode) => {
    const step = rollouts.get(node.id);

    if (!step || node.kind !== "k8s-deployment") return null;

    const target = memory.rollouts.get(node.id)?.target ?? 0;
    const grown =
      step.phase === "stalled"
        ? Math.max(0, (memory.replicas.get(node.id) ?? 0) - target)
        : 0;
    const serving = servingPods(step, node.props) + grown;
    const settled = step.phase === "complete" || step.phase === "rolled-back";

    return {
      step,
      replicas: settled ? null : serving,
      failingShare: serving > 0 ? step.failing / serving : 0,
      slowShare: serving > 0 ? step.slow / serving : 0,
    };
  };

  const conditionsOf = (node: DesignNode) => {
    const fault = state.get(node.id)!;
    const replicaIds = topo.replicasOf.get(node.id) ?? [];
    const upReplicas = Math.max(
      0,
      replicaIds.filter(isUp).length - (fault.promoted ? 1 : 0),
    );

    const slowShare = rolloutShape(node)?.slowShare ?? 0;

    return {
      capacityFactor:
        fault.capacityFactor * (1 - slowShare * (1 - 1 / SLOWDOWN)),
      replicas:
        rolloutShape(node)?.replicas ?? memory.replicas.get(node.id) ?? 1,
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

    if (node.kind === "scheduler") {
      const locks = topo.locksOf.get(node.id) ?? [];
      const firing =
        locks.length === 0 ? node.props.replicas : locks.some(isUp) ? 1 : 0;

      load = {
        reads: 0,
        writes:
          node.props.jobsPerSecond *
          firing *
          burstShare(
            node.props.everySeconds,
            node.props.burstSeconds,
            t,
            scenario.stepSeconds,
          ),
      };
    }

    const capacity = capacityOf(node, conditions);
    const limit = throttleLimitOf(node, conditions.capacityFactor);
    const offered = total(load);
    const admittedFraction =
      up && limit !== null && offered > limit ? limit / offered : 1;
    const admitted = scaleBy(load, admittedFraction);
    const rho = up ? utilisation(admitted, capacity) : 0;
    const servedFraction = !up ? 0 : rho <= SATURATION ? 1 : SATURATION / rho;
    const served = scaleBy(admitted, servedFraction);
    const unanswered =
      node.kind === "client" && outgoing.length === 0 && offered > 0;
    const rollout = rolloutShape(node);
    const ownErrorRate =
      !up || unanswered
        ? 1
        : 1 -
          admittedFraction *
            servedFraction *
            (1 - intrinsicErrorRateOf(node)) *
            (1 - (state.get(node.id)?.errorRate ?? 0)) *
            (1 - (rollout?.failingShare ?? 0)) *
            (1 - (staleShares.get(node.id) ?? 0));

    const inboundTimeouts = (topo.inbound.get(node.id) ?? []).map(
      (edge) => edge.props.timeoutMs,
    );
    const timeout =
      inboundTimeouts.length > 0
        ? Math.max(...inboundTimeouts)
        : DEFAULT_TIMEOUT_MS;
    const base = baseLatencyOf(node) + fault.addLatencyMs;
    const pinned = !up || rho >= SATURATION;
    const slowShare = rollout?.slowShare ?? 0;
    const p50 = pinned
      ? timeout
      : (base * (slowShare >= 0.5 ? SLOWDOWN : 1)) / (1 - rho);
    const p99 = pinned
      ? timeout
      : ((base * (slowShare > SLOW_TAIL ? SLOWDOWN : 1)) / (1 - rho)) *
        (1 + rho);

    const step: NodeStep = {
      reads: load.reads,
      writes: load.writes,
      rho: Math.min(rho, MAX_REPORTED_RHO),
      p50,
      p99,
      ownErrorRate,
      errorRate: ownErrorRate,
      up,
      ...(limit !== null && up
        ? { throttled: offered * (1 - admittedFraction) }
        : {}),
      ...(reportsReplicas(node) ? { replicas: conditions.replicas } : {}),
      ...(rollout ? { rollout: rollout.step } : {}),
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

        return isUp(target.id) && !isCut(edge)
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

      const routed =
        node.kind === "dns"
          ? route(outgoing, node.props.policy, (edge) => {
              const since = Math.min(
                memory.downSince.get(edge.to) ?? Number.POSITIVE_INFINITY,
                cutSince.get(edge.id) ?? Number.POSITIVE_INFINITY,
              );

              return t - since < node.props.ttlSeconds;
            })
          : null;

      for (const channel of ["reads", "writes"] as const) {
        const carrying = outgoing.filter(
          (edge) =>
            carries(edge.kind)[channel] &&
            (!feedsOnlyChanges(node) || edge.kind === "change-feed"),
        );
        const targets = healthChecked
          ? carrying.filter((edge) => isUp(edge.to) && !isCut(edge))
          : carrying;

        if (
          !routed &&
          distribution === "evenly" &&
          carrying.length > 0 &&
          targets.length === 0
        ) {
          stranded.set(
            node.id,
            (stranded.get(node.id) ?? 0) + forwarded[channel],
          );
        }

        for (const edge of carrying) {
          const portion = routed
            ? (routed.get(edge.id) ?? 0)
            : distribution === "evenly"
              ? targets.includes(edge)
                ? 1 / targets.length
                : 0
              : distribution === "broadcast"
                ? 1
                : edge.props.share;
          const tries = attemptsOf(edge);
          const amount =
            forwarded[channel] * portion * edge.props.fanOut * tries;

          if (amount > 0) attempts.set(edge.id, tries);
          const previous = edges[edge.id] ?? { reads: 0, writes: 0 };

          edges[edge.id] = { ...previous, [channel]: amount };
        }
      }

      for (const edge of outgoing) {
        if (isCut(edge)) continue;

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
      .filter((edge) => SYNCHRONOUS.has(edge.kind) || isCut(edge))
      .map((edge) => {
        const flow = edges[edge.id];
        const { lasting, transient } = isCut(edge)
          ? { lasting: 1, transient: 0 }
          : split(nodes[edge.to]?.errorRate ?? 0, persistent.get(edge.to) ?? 0);
        const retries = SYNCHRONOUS.has(edge.kind) ? edge.props.retries : 0;

        return {
          weight:
            flow && served > 0
              ? total(flow) / (attempts.get(edge.id) ?? 1) / served
              : 0,
          errorRate: lasting + (1 - lasting) * transient ** (retries + 1),
          lasting,
        };
      })
      .filter((call) => call.weight > 0);
    const lost = stranded.get(node.id) ?? 0;

    if (lost > 0 && served > 0) {
      calls.push({ weight: lost / served, errorRate: 1, lasting: 1 });
    }

    const downstream = combine(calls, (call) => call.errorRate);
    const downstreamLasting = combine(calls, (call) => call.lasting);
    const ownLasting = step.up
      ? Math.min(step.ownErrorRate, state.get(node.id)?.lastingErrorRate ?? 0)
      : step.ownErrorRate;

    step.errorRate = Math.min(
      1,
      step.ownErrorRate + (1 - step.ownErrorRate) * downstream,
    );
    persistent.set(
      node.id,
      Math.min(
        step.errorRate,
        ownLasting + (1 - step.ownErrorRate) * downstreamLasting,
      ),
    );
  }

  const pathLatency = new Map<string, { p50: number; p99: number }>();

  for (const node of [...topo.order].reverse()) {
    const step = nodes[node.id]!;
    let slowest = { p50: 0, p99: 0 };

    for (const edge of topo.outbound.get(node.id) ?? []) {
      const flow = edges[edge.id];

      if (!SYNCHRONOUS.has(edge.kind) || !flow || total(flow) === 0) continue;

      const waited = edge.props.timeoutMs * (edge.props.retries + 1);
      const reached = isCut(edge)
        ? { p50: waited, p99: waited }
        : pathLatency.get(edge.to);
      const failing = isCut(edge) ? 0 : (nodes[edge.to]?.errorRate ?? 0);
      const retried = edge.props.retries > 0;
      const below = reached && {
        p50: reached.p50 * (retried && failing > RETRY_P50_SHARE ? 2 : 1),
        p99: reached.p99 * (retried && failing > RETRY_P99_SHARE ? 2 : 1),
      };
      const hop = crossesRegions(topo, edge) ? CROSS_REGION_MS : 0;

      if (below && below.p99 + hop > slowest.p99) {
        slowest = { p50: below.p50 + hop, p99: below.p99 + hop };
      }
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

    const throttled = step.throttled ?? 0;
    const throttledRate = lambda > 0 ? throttled / lambda : 0;

    if (throttledRate > ERROR_FINDING) {
      const limit = throttleLimitOf(node, conditionsOf(node).capacityFactor)!;

      log.note(index, {
        target: { type: "node", id: node.id },
        kind: "throttled",
        message: `${label} turns away ${perSecond(throttled)} of ${perSecond(lambda)}: it lets through ${perSecond(limit)}.`,
        data: {
          throttled: round(throttled),
          lambda: round(lambda),
          limit: round(limit),
        },
        worst: throttledRate,
      });
    }

    if (step.ownErrorRate - throttledRate > ERROR_FINDING && lambda > 0) {
      log.note(index, {
        target: { type: "node", id: node.id },
        kind: "errors",
        message: step.up
          ? `${label} fails ${percent(step.ownErrorRate - throttledRate)} of what it receives: it cannot serve ${perSecond(lambda * (step.ownErrorRate - throttledRate))} of ${perSecond(lambda)}.`
          : `${label} is down and fails all ${perSecond(lambda)} it receives.`,
        data: {
          errorRate: round(step.ownErrorRate - throttledRate, 5),
          lambda: round(lambda),
        },
        worst: step.ownErrorRate - throttledRate,
      });
    }

    const rollout = memory.rollouts.get(node.id);

    if (
      step.rollout?.phase === "stalled" &&
      rollout &&
      node.kind === "k8s-deployment"
    ) {
      log.note(index, {
        target: { type: "node", id: node.id },
        kind: "rollout-stalled",
        message: `${label}'s rollout is stuck: ${node.props.progressDeadlineSeconds} s after it began, ${step.rollout.ready} of ${rollout.target} new pods are ready.`,
        data: {
          ready: step.rollout.ready,
          replicas: rollout.target,
          old: step.rollout.old,
          deadlineSeconds: node.props.progressDeadlineSeconds,
        },
        worst: 0,
      });
    }

    if (step.rollout?.phase === "rolled-back") {
      log.note(index, {
        target: { type: "node", id: node.id },
        kind: "rolled-back",
        message: `${label} rolled its canary back: the new version ${rollout?.release === "slow" ? "answered twice as slowly" : rollout?.release === "deadlocks" ? "stopped answering after a while" : "failed the requests it was sent"}, so the old one keeps serving.`,
        data: { old: step.rollout.old },
        worst: 0,
      });
    }

    const staleOld =
      rollout?.oldFailureCause === "rotation" &&
      rollout.oldFailsFrom !== null &&
      t >= rollout.oldFailsFrom
        ? (step.rollout?.old ?? 0)
        : 0;
    const staleAll = (staleShares.get(node.id) ?? 0) > 0;

    if (node.kind === "k8s-deployment" && (staleOld > 0 || staleAll)) {
      const pods = staleAll ? (memory.replicas.get(node.id) ?? 1) : staleOld;

      log.note(index, {
        target: { type: "node", id: node.id },
        kind: "stale-secret",
        message: `${label}'s pods still hold a secret's old value after it was revoked, so ${pods} ${pods === 1 ? "pod fails" : "pods fail"} every request until ${staleAll ? (node.props.secretDelivery === "volume" ? "the mounted volume is refreshed" : "they are restarted") : "the restart replaces them"}.`,
        data: { pods },
        worst: pods,
      });
    }

    if (
      rollout?.oldFailureCause === "migration" &&
      step.rollout &&
      step.rollout.old > 0
    ) {
      log.note(index, {
        target: { type: "node", id: node.id },
        kind: "schema-break",
        message: `The release's migration broke the previous version of ${label}: ${step.rollout.old} old ${step.rollout.old === 1 ? "pod fails" : "pods fail"} every request${step.rollout.phase === "rolled-back" ? ", and rolling back brought those pods back" : " until it is replaced"}.`,
        data: { old: step.rollout.old },
        worst: step.rollout.old,
      });
    }

    if (step.rollout && step.rollout.restarts >= CRASH_LOOP_RESTARTS) {
      log.note(index, {
        target: { type: "node", id: node.id },
        kind: "crash-looping",
        message: `${label}'s new pods keep hanging and being restarted: ${step.rollout.restarts} restarts so far. The liveness probe keeps them coming back, but the version never stays up.`,
        data: { restarts: step.rollout.restarts },
        worst: step.rollout.restarts,
      });
    }

    const policy =
      step.rollout?.phase === "rolling" ? null : autoscaled(topo, node);

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

  for (const [id, step] of Object.entries(nodes)) {
    memory.lastError.set(id, step.errorRate);
    memory.lastPersistent.set(id, persistent.get(id) ?? 0);
  }

  for (const edge of topo.edges) {
    const tries = attempts.get(edge.id) ?? 1;

    if (tries >= RETRY_STORM_FACTOR) {
      const from = topo.byId.get(edge.from)?.label ?? "";
      const to = topo.byId.get(edge.to)?.label ?? "";

      log.note(index, {
        target: { type: "edge", id: edge.id },
        kind: "retry-storm",
        message: `${from === "" ? edge.from : from} retries its failing calls to ${to === "" ? edge.to : to}, so it sends ${round(tries, 1)}× the load it would otherwise.`,
        data: { factor: round(tries, 2), retries: edge.props.retries },
        worst: tries,
      });
    }
  }

  return { t, nodes, edges, clients };
};

const split = (
  errorRate: number,
  lasting: number,
): { lasting: number; transient: number } => ({
  lasting,
  transient:
    lasting >= 1 ? 0 : Math.max(0, (errorRate - lasting) / (1 - lasting)),
});

const combine = <Call extends { weight: number }>(
  calls: readonly Call[],
  rate: (call: Call) => number,
): number => {
  const weights = calls.reduce((sum, call) => sum + call.weight, 0);

  return weights <= 1 + 1e-9
    ? calls.reduce((sum, call) => sum + call.weight * rate(call), 0)
    : 1 -
        calls.reduce(
          (product, call) =>
            product * (1 - Math.min(1, call.weight) * rate(call)),
          1,
        );
};

const crossesRegions = (topo: Topology, edge: DesignEdge): boolean => {
  const from = topo.regionOf.get(edge.from) ?? null;
  const to = topo.regionOf.get(edge.to) ?? null;

  return from !== null && to !== null && from !== to;
};

const route = (
  outgoing: DesignEdge[],
  policy: "latency" | "failover",
  routable: (edge: DesignEdge) => boolean,
): Map<string, number> => {
  const candidates = outgoing.filter(routable);
  const portions = new Map<string, number>();

  if (policy === "failover") {
    const primary = candidates.reduce<DesignEdge | null>(
      (best, edge) =>
        best === null || edge.props.share > best.props.share ? edge : best,
      null,
    );

    if (primary) portions.set(primary.id, 1);

    return portions;
  }

  const weight = candidates.reduce((sum, edge) => sum + edge.props.share, 0);

  for (const edge of candidates) {
    portions.set(
      edge.id,
      weight > 0 ? edge.props.share / weight : 1 / candidates.length,
    );
  }

  return portions;
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
