import { catalogue } from "../catalogue";
import { evaluateLoad } from "../evaluate/load";
import { SYNCHRONOUS } from "../evaluate/load/node-model";
import type { EvaluationResult } from "../evaluate/result";
import type { Fault, LoadScenarioInput } from "../evaluate/scenario";
import type { DesignGraph, DesignNode } from "../graph";
import {
  type ChaosSettings,
  ChaosSettingsSchema,
  type LoadDrill,
  type ProblemContent,
} from "../problems/schema";
import { type Assertion, assertion } from "./assertion";

export type ChaosKind =
  "instance" | "group-down" | "partition" | "flaky" | "cache-flush";

export interface ChaosCase {
  id: string;
  kind: ChaosKind;
  title: string;
  targetId: string;
  faults: Fault[];
}

export interface ChaosOutcome {
  passed: boolean;
  assertions: Assertion[];
  scenario: LoadScenarioInput;
}

const NOTICEABLE_ERRORS = 0.001;

const ENTRY_KINDS = new Set<string>([
  "load-balancer",
  "api-gateway",
  "dns",
  "cdn",
  "ingress",
  "k8s-service",
  "rate-limiter",
]);

const ADAPTS: ReadonlySet<ChaosKind> = new Set(["group-down", "cache-flush"]);
const BLAMED = 3;

const percent = (value: number) => `${Math.floor(value * 10_000) / 100}%`;

const nameOf = (item: { label: string; id: string }) => item.label || item.id;

export const chaosSettings = (problem: ProblemContent): ChaosSettings =>
  problem.chaos ?? ChaosSettingsSchema.parse({});

export const chaosBaseline = (problem: ProblemContent): LoadDrill | null =>
  problem.drills.find(
    (drill): drill is LoadDrill =>
      drill.kind === "load" &&
      drill.visibility === "public" &&
      drill.faults.length === 0,
  ) ?? null;

const ancestry = (graph: DesignGraph, node: DesignNode): string[] => {
  const byId = new Map(graph.groups.map((group) => [group.id, group]));
  const chain: string[] = [];
  let current = node.groupId ? byId.get(node.groupId) : undefined;

  while (current && !chain.includes(current.id)) {
    chain.push(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return chain;
};

const podsAtStart = (graph: DesignGraph, node: DesignNode): number => {
  if (node.kind !== "k8s-deployment") return 0;

  const edge = graph.edges.find(
    (candidate) => candidate.kind === "scales" && candidate.to === node.id,
  );
  const scaler = graph.nodes.find((item) => item.id === edge?.from);

  return scaler?.kind === "hpa"
    ? Math.min(
        scaler.props.max,
        Math.max(scaler.props.min, node.props.replicas),
      )
    : node.props.replicas;
};

interface Window {
  at: number;
  until: number;
}

const lostInstance = (
  graph: DesignGraph,
  node: DesignNode,
  window: Window,
): Omit<ChaosCase, "id" | "kind" | "targetId"> | null => {
  const name = nameOf(node);
  const down = (title: string) => ({
    title,
    faults: [{ kind: "node-down" as const, nodeId: node.id, ...window }],
  });
  const shrink = (title: string, factor: number) => ({
    title,
    faults: [{ kind: "capacity" as const, nodeId: node.id, factor, ...window }],
  });
  const failing = (title: string, rate: number) => ({
    title,
    faults: [
      {
        kind: "error-rate" as const,
        nodeId: node.id,
        rate,
        lasting: true,
        ...window,
      },
    ],
  });
  const lose = (count: number, unit: string) =>
    count < 2
      ? down(`${name}'s only ${unit} fails`)
      : shrink(
          `${name} loses one of its ${count} ${unit}s`,
          (count - 1) / count,
        );

  switch (node.kind) {
    case "service":
    case "worker":
      return lose(node.props.replicas, "replica");
    case "k8s-deployment":
      return lose(podsAtStart(graph, node), "pod");
    case "sql-database":
      return down(
        graph.edges.some(
          (edge) => edge.kind === "replication" && edge.from === node.id,
        )
          ? `${name} (the primary) fails`
          : `${name} fails`,
      );
    case "nosql-database":
      return node.props.replicationFactor < 2
        ? failing(
            `${name} loses a node and the partitions on it`,
            1 / node.props.partitions,
          )
        : node.props.partitions > 1
          ? shrink(
              `${name} loses a node`,
              (node.props.partitions - 1) / node.props.partitions,
            )
          : null;
    case "stream":
      return node.props.replicationFactor < 2
        ? failing(
            `${name} loses a broker and the partitions on it`,
            1 / node.props.partitions,
          )
        : null;
    case "coordination":
      return node.props.members < 3 ? down(`${name} loses a member`) : null;
    default:
      return null;
  }
};

export const loadedNodes = (result: EvaluationResult): Set<string> =>
  new Set(
    result.steps.flatMap((step) =>
      Object.entries(step.nodes)
        .filter(([, numbers]) => numbers.reads + numbers.writes > 0)
        .map(([id]) => id),
    ),
  );

export const chaosCases = (
  graph: DesignGraph,
  settings: ChaosSettings,
  loaded?: ReadonlySet<string>,
): ChaosCase[] => {
  const window = {
    at: settings.faultAt,
    until: settings.faultAt + settings.faultSeconds,
  };
  const serving = graph.nodes.filter(
    (node) =>
      node.kind !== "client" &&
      catalogue[node.kind].carriesTraffic &&
      (loaded?.has(node.id) ?? true),
  );
  const servingIds = new Set(serving.map((node) => node.id));
  const chains = new Map(
    graph.nodes.map((node) => [node.id, ancestry(graph, node)]),
  );
  const inside = (groupId: string, nodeId: string) =>
    chains.get(nodeId)?.includes(groupId) ?? false;
  const seenMembers = new Set<string>();
  const occupied = graph.groups.filter((group) => {
    const members = serving
      .filter((node) => inside(group.id, node.id))
      .map((node) => node.id)
      .sort()
      .join(",");

    if (members === "" || seenMembers.has(members)) return false;

    seenMembers.add(members);

    return true;
  });
  const called = [
    ...new Set(
      graph.edges
        .filter(
          (edge) =>
            SYNCHRONOUS.has(edge.kind) &&
            servingIds.has(edge.to) &&
            !ENTRY_KINDS.has(
              graph.nodes.find((node) => node.id === edge.to)?.kind ?? "",
            ),
        )
        .map((edge) => edge.to),
    ),
  ].flatMap((id) => serving.filter((node) => node.id === id));

  const cases: ChaosCase[] = [
    ...serving.flatMap((node): ChaosCase[] => {
      const lost = lostInstance(graph, node, window);

      return lost
        ? [
            {
              id: `chaos:instance:${node.id}`,
              kind: "instance",
              targetId: node.id,
              ...lost,
            },
          ]
        : [];
    }),
    ...occupied.map((group): ChaosCase => ({
      id: `chaos:group-down:${group.id}`,
      kind: "group-down",
      title: `${nameOf(group)} is lost`,
      targetId: group.id,
      faults: [{ kind: "group-down", groupId: group.id, ...window }],
    })),
    ...called.map((node): ChaosCase => ({
      id: `chaos:flaky:${node.id}`,
      kind: "flaky",
      title: `${nameOf(node)} fails ${percent(settings.errorRate)} of requests`,
      targetId: node.id,
      faults: [
        {
          kind: "error-rate",
          nodeId: node.id,
          rate: settings.errorRate,
          ...window,
        },
      ],
    })),
    ...serving
      .filter((node) => node.kind === "cache" || node.kind === "cdn")
      .map((node): ChaosCase => ({
        id: `chaos:cache-flush:${node.id}`,
        kind: "cache-flush",
        title: `${nameOf(node)} is emptied`,
        targetId: node.id,
        faults: [{ kind: "cache-flush", nodeId: node.id, at: window.at }],
      })),
  ];

  return cases.slice(0, settings.maxCases);
};

const blame = (
  graph: DesignGraph,
  result: EvaluationResult,
  index: number,
): string[] => {
  const step = result.steps[index];

  if (!step) return [];

  return graph.nodes
    .filter((node) => node.kind !== "client" && step.nodes[node.id])
    .map((node) => {
      const numbers = step.nodes[node.id]!;

      return { id: node.id, weight: numbers.up ? numbers.ownErrorRate : 1 };
    })
    .filter(({ weight }) => weight > NOTICEABLE_ERRORS)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, BLAMED)
    .map(({ id }) => id);
};

export const runChaosCase = (
  graph: DesignGraph,
  chaos: ChaosCase,
  baseline: LoadDrill,
  settings: ChaosSettings,
): ChaosOutcome => {
  const until = settings.faultAt + settings.faultSeconds;
  const scenario: LoadScenarioInput = {
    kind: "load",
    durationSeconds: until + settings.recoverySeconds,
    traffic: baseline.traffic,
    faults: chaos.faults,
    slo: baseline.slo,
  };
  const result = evaluateLoad(graph, scenario);
  const from = settings.faultAt + settings.graceSeconds;
  const during = result.steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.t >= from && step.t < until);
  const clients = graph.nodes.filter((node) => node.kind === "client");
  const assertions: Assertion[] = [];

  const lastDuring = during.at(-1);

  for (const client of clients) {
    const label = nameOf(client);
    const served = during.map(({ step }) => step.clients[client.id]);

    if (ADAPTS.has(chaos.kind)) {
      const atEnd = lastDuring?.step.clients[client.id]?.availability ?? 1;

      assertions.push(
        assertion({
          label: `Requests served for ${label} by the end of it`,
          expected: `≥ ${percent(settings.minAvailability)}`,
          actual: percent(atEnd),
          passed: atEnd >= settings.minAvailability,
          at: lastDuring?.step.t ?? null,
          nodeIds: [client.id, ...blame(graph, result, lastDuring?.index ?? 0)],
          message: `${label} had ${percent(atEnd)} of requests served ${settings.faultSeconds} s into “${chaos.title}”; the test needs ${percent(settings.minAvailability)} by then.`,
        }),
      );
    } else {
      const average =
        served.length === 0
          ? 1
          : served.reduce((sum, item) => sum + (item?.availability ?? 1), 0) /
            served.length;
      const worst = during.reduce<{ index: number; availability: number }>(
        (lowest, { step, index }) => {
          const availability = step.clients[client.id]?.availability ?? 1;

          return availability < lowest.availability
            ? { index, availability }
            : lowest;
        },
        { index: during[0]?.index ?? 0, availability: 2 },
      );

      assertions.push(
        assertion({
          label: `Requests served for ${label} while it lasts`,
          expected: `≥ ${percent(settings.minAvailability)}`,
          actual: percent(average),
          passed: average >= settings.minAvailability,
          at: result.steps[worst.index]?.t ?? null,
          nodeIds: [client.id, ...blame(graph, result, worst.index)],
          message: `${label} had ${percent(average)} of requests served on average during “${chaos.title}”, after the first ${settings.graceSeconds} s; the test needs ${percent(settings.minAvailability)}.`,
        }),
      );
    }

    const lastIndex = result.steps.length - 1;
    const last = result.steps[lastIndex]?.clients[client.id];
    const recovered =
      (last?.availability ?? 1) >= baseline.slo.availability &&
      (last?.p99 ?? 0) <= baseline.slo.p99Ms;

    assertions.push(
      assertion({
        label: `${label} back within the SLO ${settings.recoverySeconds}\u00a0s later`,
        expected: `≥ ${percent(baseline.slo.availability)}, p99 ≤ ${baseline.slo.p99Ms} ms`,
        actual: `${percent(last?.availability ?? 1)}, p99 ${Math.round(last?.p99 ?? 0)} ms`,
        passed: recovered,
        at: result.steps[lastIndex]?.t ?? null,
        nodeIds: [client.id, ...blame(graph, result, lastIndex)],
        message: `${label} was not back within the SLO ${settings.recoverySeconds} s after the fault ended: ${percent(last?.availability ?? 1)} served, p99 ${Math.round(last?.p99 ?? 0)} ms.`,
      }),
    );
  }

  return {
    passed: assertions.every((item) => item.passed),
    assertions,
    scenario,
  };
};
