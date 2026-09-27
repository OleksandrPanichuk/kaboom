import type { DesignGraph, EvaluationStep } from "@repo/design";

import type { HeatTone } from "@/features/simulation/typedefs";

import { formatRate, formatShare, heatOf, turnedAway } from "./heat";

export interface SimulationOverlay {
  nodes: Record<string, { tone: HeatTone; text: string }>;
  edges: Record<string, number>;
}

export const overlayAt = (
  graph: DesignGraph,
  step: EvaluationStep | undefined,
): SimulationOverlay | null => {
  if (!step) return null;

  const nodes: SimulationOverlay["nodes"] = {};

  for (const node of graph.nodes) {
    const numbers = step.nodes[node.id];
    const tone = heatOf(numbers);

    if (!numbers) continue;

    const load = numbers.reads + numbers.writes;

    nodes[node.id] = {
      tone,
      text:
        tone === "down"
          ? "Down"
          : node.kind === "client"
            ? `Sends ${formatRate(load)}`
            : turnedAway(numbers) > 0
              ? `${formatRate(load)} · ${formatRate(turnedAway(numbers))} turned away`
              : numbers.backlog
                ? `${formatShare(numbers.rho)} · ${formatRate(load)} · ${Math.round(numbers.backlog).toLocaleString("en")} waiting`
                : `${formatShare(numbers.rho)} · ${formatRate(load)}`,
    };
  }

  const traffic = Object.fromEntries(
    Object.entries(step.edges).map(([id, flow]) => [
      id,
      flow.reads + flow.writes,
    ]),
  );
  const busiest = Math.max(0, ...Object.values(traffic));
  const edges: SimulationOverlay["edges"] = {};

  for (const edge of graph.edges) {
    edges[edge.id] = busiest > 0 ? (traffic[edge.id] ?? 0) / busiest : 0;
  }

  return { nodes, edges };
};
