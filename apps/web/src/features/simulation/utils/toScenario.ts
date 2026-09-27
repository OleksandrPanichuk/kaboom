import type { DesignGraph, Fault, LoadScenarioInput } from "@repo/design";

import { STEP_SECONDS } from "@/features/simulation/constants";
import type { FaultDraft, ScenarioDraft } from "@/features/simulation/typedefs";

const toFault = (draft: FaultDraft): Fault => {
  const window = {
    nodeId: draft.nodeId,
    at: draft.at,
    ...(draft.until !== null ? { until: draft.until } : {}),
  };

  switch (draft.kind) {
    case "node-down":
      return { kind: "node-down", ...window };
    case "capacity":
      return { kind: "capacity", ...window, factor: draft.factor };
    case "latency":
      return { kind: "latency", ...window, addMs: draft.addMs };
    case "cache-flush":
      return { kind: "cache-flush", nodeId: draft.nodeId, at: draft.at };
  }
};

export const liveFaults = (
  draft: ScenarioDraft,
  graph: DesignGraph,
): FaultDraft[] => {
  const ids = new Set(graph.nodes.map((node) => node.id));

  return draft.faults.filter((fault) => ids.has(fault.nodeId));
};

export const toScenario = (
  draft: ScenarioDraft,
  graph: DesignGraph,
): LoadScenarioInput => ({
  kind: "load",
  stepSeconds: STEP_SECONDS,
  durationSeconds: draft.durationSeconds,
  traffic: draft.spike.enabled
    ? [
        { at: draft.spike.at, multiplier: draft.spike.multiplier },
        ...(draft.spike.until !== null
          ? [{ at: draft.spike.until, multiplier: 1 }]
          : []),
      ]
    : [],
  faults: liveFaults(draft, graph).map(toFault),
  slo: { p99Ms: draft.sloP99Ms, availability: draft.sloAvailability },
});
