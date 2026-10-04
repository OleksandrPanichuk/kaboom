import { evaluateLoad } from "../evaluate/load";
import { evaluateNetwork } from "../evaluate/network";
import { evaluatePipeline } from "../evaluate/pipeline";
import type { EvaluationResult, Finding } from "../evaluate/result";
import type { DesignGraph } from "../graph";
import { drillScenario, selectNodes } from "./resolve";
import type { Drill, LoadDrill, NetworkDrill, PipelineDrill } from "./schema";

export interface DrillOutcome {
  drillId: string;
  passed: boolean;
  failures: string[];
  findings: Finding[];
  result?: EvaluationResult;
}

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

export const runDrill = (drill: Drill, graph: DesignGraph): DrillOutcome => {
  switch (drill.kind) {
    case "pipeline":
      return runPipelineDrill(drill, graph);
    case "network":
      return runNetworkDrill(drill, graph);
    case "load":
      return runLoadDrill(drill, graph);
  }
};

const runNetworkDrill = (
  drill: NetworkDrill,
  graph: DesignGraph,
): DrillOutcome => {
  const result = evaluateNetwork(graph);
  const failures: string[] = [];

  const clients = new Set(
    graph.nodes.filter((node) => node.kind === "client").map(({ id }) => id),
  );

  if (clients.size === 0) {
    failures.push("The design has no client, so nothing connects through it.");
  } else if (!graph.edges.some((edge) => clients.has(edge.from))) {
    failures.push(
      "Nothing is connected to the clients, so no request reaches the design.",
    );
  }

  for (const kind of drill.expect.forbid) {
    for (const found of result.findings.filter((item) => item.kind === kind)) {
      failures.push(found.message);
    }
  }

  return {
    drillId: drill.id,
    passed: failures.length === 0,
    failures,
    findings: result.findings,
  };
};

const runPipelineDrill = (
  drill: PipelineDrill,
  graph: DesignGraph,
): DrillOutcome => {
  const result = evaluatePipeline(graph, {
    kind: "pipeline",
    changedShare: drill.changedShare,
  });
  const failures: string[] = [];
  const { maxLeadTimeMinutes, minGreenRate } = drill.expect;
  const deploys = graph.nodes.some(
    (node) => node.kind === "pipeline-stage" && node.props.stage === "deploy",
  );

  if (result.stages.length === 0) {
    failures.push("The design has no pipeline, so nothing builds or ships.");
  } else if (!deploys) {
    failures.push("Nothing in the pipeline deploys, so no change ships.");
  }

  if (
    maxLeadTimeMinutes !== undefined &&
    result.leadTimeMinutes > maxLeadTimeMinutes
  ) {
    failures.push(
      `A change takes ${Math.round(result.leadTimeMinutes)} minutes from merge to production; the drill allows ${maxLeadTimeMinutes}.`,
    );
  }

  if (minGreenRate !== undefined && result.greenRate < minGreenRate) {
    failures.push(
      `${percent(result.greenRate)} of runs go green; the drill needs ${percent(minGreenRate)}.`,
    );
  }

  for (const kind of drill.expect.forbid) {
    const found = result.findings.find((finding) => finding.kind === kind);

    if (found) failures.push(found.message);
  }

  return {
    drillId: drill.id,
    passed: failures.length === 0,
    failures,
    findings: result.findings,
  };
};

const runLoadDrill = (drill: LoadDrill, graph: DesignGraph): DrillOutcome => {
  const result = evaluateLoad(graph, drillScenario(drill, graph));
  const failures: string[] = [];
  const clients = graph.nodes.filter((node) => node.kind === "client");

  if (clients.length === 0) {
    failures.push("The design has no client, so nothing is sent through it.");
  }

  for (const fault of drill.faults) {
    if (fault.kind !== "rollout" && fault.kind !== "secret-rotation") continue;

    if (selectNodes(graph, fault.select).length === 0) {
      failures.push(
        fault.kind === "rollout"
          ? "The design has no deployment to roll out, so the drill tests nothing."
          : "The design has no secret to rotate, so the drill tests nothing.",
      );
    }
  }

  for (const client of clients) {
    const label = client.label || client.id;
    const seen = result.steps.map((step) => step.clients[client.id]);
    const worstP99 = Math.max(0, ...seen.map((step) => step?.p99 ?? 0));
    const worstAvailability = Math.min(
      1,
      ...seen.map((step) => step?.availability ?? 1),
    );
    const { maxP99Ms, minAvailability, endAvailability, endMaxP99Ms } =
      drill.expect;
    const last = seen.at(-1)?.availability ?? 1;
    const lastP99 = seen.at(-1)?.p99 ?? 0;

    if (maxP99Ms !== undefined && worstP99 > maxP99Ms) {
      failures.push(
        `${label} saw p99 reach ${Math.round(worstP99)} ms; the drill allows ${maxP99Ms} ms.`,
      );
    }

    if (minAvailability !== undefined && worstAvailability < minAvailability) {
      failures.push(
        `${label} had ${percent(worstAvailability)} of requests served at worst; the drill needs ${percent(minAvailability)}.`,
      );
    }

    if (endMaxP99Ms !== undefined && lastP99 > endMaxP99Ms) {
      failures.push(
        `${label} ended the drill with p99 at ${Math.round(lastP99)} ms; the drill needs ${endMaxP99Ms} ms by then.`,
      );
    }

    if (endAvailability !== undefined && last < endAvailability) {
      failures.push(
        `${label} ended the drill with ${percent(last)} of requests served; the drill needs ${percent(endAvailability)} by then.`,
      );
    }
  }

  if (drill.expect.maxEndBacklog !== undefined) {
    const last = result.steps.at(-1);
    const waiting = graph.nodes
      .map((item) => ({ item, backlog: last?.nodes[item.id]?.backlog ?? 0 }))
      .filter(({ backlog }) => backlog > drill.expect.maxEndBacklog!);

    for (const { item, backlog } of waiting) {
      failures.push(
        `${item.label || item.id} still had ${Math.round(backlog).toLocaleString("en")} messages waiting at the end; the drill allows ${drill.expect.maxEndBacklog.toLocaleString("en")}.`,
      );
    }
  }

  if (drill.expect.detectWithinSeconds !== undefined) {
    const onset = Math.min(
      ...drill.faults.map((fault) => fault.at),
      ...(drill.traffic ?? []).map((point) => point.at),
      drill.durationSeconds,
    );
    const firedAt = result.alerts.flatMap((alert) =>
      alert.firedAt === null ? [] : [alert.firedAt],
    );
    const first = firedAt.length > 0 ? Math.min(...firedAt) : null;
    const limit = drill.expect.detectWithinSeconds;

    if (first === null) {
      failures.push(
        `Nobody was paged: no alert fired, and the drill needs one within ${limit} s of the trouble starting.`,
      );
    } else if (first - onset > limit) {
      failures.push(
        `The first page came ${first - onset} s after the trouble started; the drill needs one within ${limit} s.`,
      );
    }
  }

  if (drill.expect.maxPods !== undefined) {
    const pods = podsAtMost(graph);

    if (pods > drill.expect.maxPods) {
      failures.push(
        `The design may run ${pods} pods; the budget allows ${drill.expect.maxPods}.`,
      );
    }
  }

  for (const kind of drill.expect.forbid) {
    const found = result.findings.find((finding) => finding.kind === kind);

    if (found) failures.push(found.message);
  }

  return {
    drillId: drill.id,
    passed: failures.length === 0,
    failures,
    findings: result.findings,
    result,
  };
};
