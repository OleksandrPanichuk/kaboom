import { evaluateLoad } from "../evaluate/load";
import { evaluateNetwork } from "../evaluate/network";
import { evaluatePipeline } from "../evaluate/pipeline";
import type {
  EvaluationResult,
  EvaluationStep,
  Finding,
} from "../evaluate/result";
import type { LoadScenarioInput } from "../evaluate/scenario";
import type { DesignGraph } from "../graph";
import {
  type Assertion,
  assertion,
  failuresOf,
  fromFinding,
  structural,
} from "../testing/assertion";
import { vary } from "../testing/variation";
import { drillScenario, selectNodes } from "./resolve";
import type { Drill, LoadDrill, NetworkDrill, PipelineDrill } from "./schema";

export interface DrillOutcome {
  drillId: string;
  passed: boolean;
  failures: string[];
  assertions: Assertion[];
  findings: Finding[];
  result?: EvaluationResult;
  scenario?: LoadScenarioInput;
}

const BLAMED = 3;
const NOTICEABLE_ERRORS = 0.001;

const podsAtMost = (graph: DesignGraph): number =>
  graph.nodes.reduce((sum, item) => {
    if (item.kind !== "k8s-deployment") return sum;

    const scaler = graph.edges.find(
      (edge) => edge.kind === "scales" && edge.to === item.id,
    );
    const autoscaler = graph.nodes.find((other) => other.id === scaler?.from);

    return (
      sum +
      Math.max(
        item.props.replicas,
        autoscaler?.kind === "hpa" ? autoscaler.props.max : 0,
      )
    );
  }, 0);

const percent = (value: number) => `${Math.floor(value * 10_000) / 100}%`;

const outcome = (
  drillId: string,
  assertions: Assertion[],
  findings: Finding[],
  extra: Pick<DrillOutcome, "result" | "scenario"> = {},
): DrillOutcome => {
  const failures = failuresOf(assertions);

  return {
    drillId,
    passed: failures.length === 0,
    failures,
    assertions,
    findings,
    ...extra,
  };
};

const forbidden = (
  kinds: ReadonlyArray<Finding["kind"]>,
  findings: readonly Finding[],
  every: boolean,
  result?: EvaluationResult,
): Assertion[] =>
  kinds.flatMap((kind) => {
    const found = findings.filter((item) => item.kind === kind);

    if (found.length === 0) {
      return [
        assertion({
          label: `No ${kind.replaceAll("-", " ")}`,
          expected: "none",
          actual: "none",
          passed: true,
          message: "",
        }),
      ];
    }

    return (every ? found : found.slice(0, 1)).map((item) =>
      fromFinding(item, result),
    );
  });

const blame = (
  graph: DesignGraph,
  step: EvaluationStep | undefined,
  by: "errors" | "latency",
): string[] => {
  if (!step) return [];

  return graph.nodes
    .filter((item) => item.kind !== "client" && step.nodes[item.id])
    .map((item) => {
      const numbers = step.nodes[item.id]!;
      const weight =
        by === "errors" ? (numbers.up ? numbers.ownErrorRate : 1) : numbers.p99;

      return { id: item.id, weight };
    })
    .filter(({ weight }) =>
      by === "errors" ? weight > NOTICEABLE_ERRORS : weight > 0,
    )
    .sort((a, b) => b.weight - a.weight)
    .slice(0, BLAMED)
    .map(({ id }) => id);
};

const worstIndex = (values: readonly number[], higherIsWorse: boolean) =>
  values.reduce(
    (worst, value, index) =>
      (higherIsWorse ? value > values[worst]! : value < values[worst]!)
        ? index
        : worst,
    0,
  );

const DURABLE_KINDS = new Set<string>([
  "sql-database",
  "nosql-database",
  "object-storage",
  "queue",
  "stream",
]);

const KEPT_SHARE = 0.99;

const persisted = (
  graph: DesignGraph,
  result: EvaluationResult,
): Assertion[] => {
  const index = result.steps.length - 1;
  const step = result.steps[index];

  if (!step) return [];

  const writes = graph.nodes
    .filter((node) => node.kind === "client")
    .reduce((sum, node) => {
      const client = step.clients[node.id];
      const readRatio = (node.props as { readRatio?: number }).readRatio ?? 1;

      return (
        sum +
        (client?.emitted ?? 0) * (1 - readRatio) * (client?.availability ?? 1)
      );
    }, 0);

  if (writes <= 0) return [];

  const stores = graph.nodes.filter((node) => DURABLE_KINDS.has(node.kind));
  const kept = stores.reduce(
    (sum, node) => sum + (step.nodes[node.id]?.writes ?? 0),
    0,
  );
  const perSecond = (value: number) =>
    `${Math.round(value).toLocaleString("en")}/s`;

  return [
    assertion({
      label: "Writes reach a store that keeps them",
      expected: `≥ ${perSecond(writes * KEPT_SHARE)}`,
      actual: perSecond(kept),
      passed: kept >= writes * KEPT_SHARE,
      at: step.t,
      nodeIds: stores.map((node) => node.id),
      message:
        stores.length === 0
          ? `The clients write ${perSecond(writes)}, and no database, queue, stream or object store keeps any of it.`
          : `The clients write ${perSecond(writes)}, but only ${perSecond(kept)} reaches a database, queue, stream or object store.`,
    }),
  ];
};

export interface RunDrillOptions {
  keepsWrites?: boolean;
}

export const runDrill = (
  drill: Drill,
  graph: DesignGraph,
  seed = 0,
  { keepsWrites = false }: RunDrillOptions = {},
): DrillOutcome => {
  switch (drill.kind) {
    case "pipeline":
      return runPipelineDrill(drill, graph);
    case "network":
      return runNetworkDrill(drill, graph);
    case "load":
      return runLoadDrill(drill, graph, seed, keepsWrites);
  }
};

const runNetworkDrill = (
  drill: NetworkDrill,
  graph: DesignGraph,
): DrillOutcome => {
  const result = evaluateNetwork(graph);
  const assertions: Assertion[] = [];
  const clients = new Set(
    graph.nodes.filter((node) => node.kind === "client").map(({ id }) => id),
  );

  if (clients.size === 0) {
    assertions.push(
      structural(
        "A client",
        "The design has no client, so nothing connects through it.",
      ),
    );
  } else if (!graph.edges.some((edge) => clients.has(edge.from))) {
    assertions.push(
      structural(
        "Something connected to the clients",
        "Nothing is connected to the clients, so no request reaches the design.",
      ),
    );
  }

  assertions.push(...forbidden(drill.expect.forbid, result.findings, true));

  return outcome(drill.id, assertions, result.findings);
};

const runPipelineDrill = (
  drill: PipelineDrill,
  graph: DesignGraph,
): DrillOutcome => {
  const result = evaluatePipeline(graph, {
    kind: "pipeline",
    changedShare: drill.changedShare,
  });
  const assertions: Assertion[] = [];
  const { maxLeadTimeMinutes, minGreenRate } = drill.expect;
  const deploys = graph.nodes.some(
    (node) => node.kind === "pipeline-stage" && node.props.stage === "deploy",
  );

  if (result.stages.length === 0) {
    assertions.push(
      structural(
        "A pipeline",
        "The design has no pipeline, so nothing builds or ships.",
      ),
    );
  } else if (!deploys) {
    assertions.push(
      structural(
        "A deploy stage",
        "Nothing in the pipeline deploys, so no change ships.",
      ),
    );
  }

  if (maxLeadTimeMinutes !== undefined) {
    const minutes = Math.round(result.leadTimeMinutes);

    assertions.push(
      assertion({
        label: "Lead time from merge to production",
        expected: `≤ ${maxLeadTimeMinutes} min`,
        actual: `${minutes} min`,
        passed: result.leadTimeMinutes <= maxLeadTimeMinutes,
        message: `A change takes ${minutes} minutes from merge to production; the drill allows ${maxLeadTimeMinutes}.`,
      }),
    );
  }

  if (minGreenRate !== undefined) {
    assertions.push(
      assertion({
        label: "Runs that go green",
        expected: `≥ ${percent(minGreenRate)}`,
        actual: percent(result.greenRate),
        passed: result.greenRate >= minGreenRate,
        message: `${percent(result.greenRate)} of runs go green; the drill needs ${percent(minGreenRate)}.`,
      }),
    );
  }

  assertions.push(...forbidden(drill.expect.forbid, result.findings, false));

  return outcome(drill.id, assertions, result.findings);
};

const runLoadDrill = (
  drill: LoadDrill,
  graph: DesignGraph,
  seed: number,
  keepsWrites: boolean,
): DrillOutcome => {
  const scenario = drillScenario(drill, graph);
  const varied = vary(graph, scenario, seed);
  const result = evaluateLoad(varied.graph, varied.scenario);
  const assertions: Assertion[] = [];
  const clients = graph.nodes.filter((node) => node.kind === "client");
  const timeOf = (index: number) => result.steps[index]?.t ?? null;

  if (clients.length === 0) {
    assertions.push(
      structural(
        "A client",
        "The design has no client, so nothing is sent through it.",
      ),
    );
  }

  for (const fault of drill.faults) {
    if (fault.kind !== "rollout" && fault.kind !== "secret-rotation") continue;

    if (selectNodes(graph, fault.select).length === 0) {
      assertions.push(
        fault.kind === "rollout"
          ? structural(
              "A deployment to roll out",
              "The design has no deployment to roll out, so the drill tests nothing.",
            )
          : structural(
              "A secret to rotate",
              "The design has no secret to rotate, so the drill tests nothing.",
            ),
      );
    }
  }

  const { maxP99Ms, minAvailability, endAvailability, endMaxP99Ms } =
    drill.expect;
  const lastIndex = result.steps.length - 1;

  for (const client of clients) {
    const label = client.label || client.id;
    const seen = result.steps.map((step) => step.clients[client.id]);
    const p99s = seen.map((step) => step?.p99 ?? 0);
    const served = seen.map((step) => step?.availability ?? 1);
    const slowest = worstIndex(p99s, true);
    const poorest = worstIndex(served, false);
    const worstP99 = Math.max(0, p99s[slowest] ?? 0);
    const worstAvailability = Math.min(1, served[poorest] ?? 1);
    const last = served.at(-1) ?? 1;
    const lastP99 = p99s.at(-1) ?? 0;

    if (maxP99Ms !== undefined) {
      assertions.push(
        assertion({
          label: `Worst p99 for ${label}`,
          expected: `≤ ${maxP99Ms} ms`,
          actual: `${Math.round(worstP99)} ms`,
          passed: worstP99 <= maxP99Ms,
          at: timeOf(slowest),
          nodeIds: [
            client.id,
            ...blame(graph, result.steps[slowest], "latency"),
          ],
          message: `${label} saw p99 reach ${Math.round(worstP99)} ms; the drill allows ${maxP99Ms} ms.`,
        }),
      );
    }

    if (minAvailability !== undefined) {
      assertions.push(
        assertion({
          label: `Requests served for ${label}, at worst`,
          expected: `≥ ${percent(minAvailability)}`,
          actual: percent(worstAvailability),
          passed: worstAvailability >= minAvailability,
          at: timeOf(poorest),
          nodeIds: [
            client.id,
            ...blame(graph, result.steps[poorest], "errors"),
          ],
          message: `${label} had ${percent(worstAvailability)} of requests served at worst; the drill needs ${percent(minAvailability)}.`,
        }),
      );
    }

    if (endMaxP99Ms !== undefined) {
      assertions.push(
        assertion({
          label: `p99 for ${label} at the end`,
          expected: `≤ ${endMaxP99Ms} ms`,
          actual: `${Math.round(lastP99)} ms`,
          passed: lastP99 <= endMaxP99Ms,
          at: timeOf(lastIndex),
          nodeIds: [
            client.id,
            ...blame(graph, result.steps[lastIndex], "latency"),
          ],
          message: `${label} ended the drill with p99 at ${Math.round(lastP99)} ms; the drill needs ${endMaxP99Ms} ms by then.`,
        }),
      );
    }

    if (endAvailability !== undefined) {
      assertions.push(
        assertion({
          label: `Requests served for ${label} at the end`,
          expected: `≥ ${percent(endAvailability)}`,
          actual: percent(last),
          passed: last >= endAvailability,
          at: timeOf(lastIndex),
          nodeIds: [
            client.id,
            ...blame(graph, result.steps[lastIndex], "errors"),
          ],
          message: `${label} ended the drill with ${percent(last)} of requests served; the drill needs ${percent(endAvailability)} by then.`,
        }),
      );
    }
  }

  if (drill.expect.maxEndBacklog !== undefined) {
    const limit = drill.expect.maxEndBacklog;
    const lastStep = result.steps.at(-1);
    const queued = graph.nodes
      .map((item) => ({ item, backlog: lastStep?.nodes[item.id]?.backlog }))
      .filter(
        (
          entry,
        ): entry is { item: (typeof graph.nodes)[number]; backlog: number } =>
          entry.backlog !== undefined,
      );

    for (const { item, backlog } of queued) {
      assertions.push(
        assertion({
          label: `Messages left in ${item.label || item.id}`,
          expected: `≤ ${limit.toLocaleString("en")}`,
          actual: Math.round(backlog).toLocaleString("en"),
          passed: Math.round(backlog) <= limit,
          at: timeOf(lastIndex),
          nodeIds: [item.id],
          message: `${item.label || item.id} still had ${Math.round(backlog).toLocaleString("en")} messages waiting at the end; the drill allows ${limit.toLocaleString("en")}.`,
        }),
      );
    }
  }

  if (drill.expect.detectWithinSeconds !== undefined) {
    const onset = Math.min(
      ...(varied.scenario.faults ?? []).map((fault) => fault.at),
      ...(drill.traffic ?? []).map((point) => point.at),
      drill.durationSeconds,
    );
    const fired = result.alerts.flatMap((alert) =>
      alert.firedAt === null ? [] : [alert],
    );
    const first = fired.reduce<(typeof fired)[number] | null>(
      (earliest, alert) =>
        earliest === null || alert.firedAt! < earliest.firedAt!
          ? alert
          : earliest,
      null,
    );
    const limit = drill.expect.detectWithinSeconds;

    assertions.push(
      first === null
        ? assertion({
            label: "Someone is paged",
            expected: `within ${limit} s`,
            actual: "never",
            passed: false,
            message: `Nobody was paged: no alert fired, and the drill needs one within ${limit} s of the trouble starting.`,
          })
        : assertion({
            label: "Someone is paged",
            expected: `within ${limit} s`,
            actual: `after ${first.firedAt! - onset} s`,
            passed: first.firedAt! - onset <= limit,
            at: first.firedAt,
            nodeIds: [first.alertId],
            message: `The first page came ${first.firedAt! - onset} s after the trouble started; the drill needs one within ${limit} s.`,
          }),
    );
  }

  if (drill.expect.maxPods !== undefined) {
    const pods = podsAtMost(graph);

    assertions.push(
      assertion({
        label: "Pods the design may run",
        expected: `≤ ${drill.expect.maxPods}`,
        actual: String(pods),
        passed: pods <= drill.expect.maxPods,
        message: `The design may run ${pods} pods; the budget allows ${drill.expect.maxPods}.`,
      }),
    );
  }

  if (keepsWrites && drill.faults.length === 0) {
    assertions.push(...persisted(graph, result));
  }

  assertions.push(
    ...forbidden(drill.expect.forbid, result.findings, false, result),
  );

  return outcome(drill.id, assertions, result.findings, { result, scenario });
};
