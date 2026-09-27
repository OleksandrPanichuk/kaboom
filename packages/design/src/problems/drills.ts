import { evaluateLoad } from "../evaluate/load";
import type { EvaluationResult } from "../evaluate/result";
import type { DesignGraph } from "../graph";
import { drillScenario } from "./resolve";
import type { Drill } from "./schema";

export interface DrillOutcome {
  drillId: string;
  passed: boolean;
  failures: string[];
  result: EvaluationResult;
}

const percent = (value: number) => `${Math.floor(value * 10_000) / 100}%`;

export const runDrill = (drill: Drill, graph: DesignGraph): DrillOutcome => {
  const result = evaluateLoad(graph, drillScenario(drill, graph));
  const failures: string[] = [];
  const clients = graph.nodes.filter((node) => node.kind === "client");

  if (clients.length === 0) {
    failures.push("The design has no client, so nothing is sent through it.");
  }

  for (const client of clients) {
    const label = client.label || client.id;
    const seen = result.steps.map((step) => step.clients[client.id]);
    const worstP99 = Math.max(0, ...seen.map((step) => step?.p99 ?? 0));
    const worstAvailability = Math.min(
      1,
      ...seen.map((step) => step?.availability ?? 1),
    );
    const { maxP99Ms, minAvailability, endAvailability } = drill.expect;
    const last = seen.at(-1)?.availability ?? 1;

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

  for (const kind of drill.expect.forbid) {
    const found = result.findings.find((finding) => finding.kind === kind);

    if (found) failures.push(found.message);
  }

  return { drillId: drill.id, passed: failures.length === 0, failures, result };
};
