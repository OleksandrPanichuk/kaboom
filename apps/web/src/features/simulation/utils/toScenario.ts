import type { DesignGraph, Fault, LoadScenarioInput } from "@repo/design";

import { STEP_SECONDS } from "@/features/simulation/constants";
import type { FaultDraft, ScenarioDraft } from "@/features/simulation/typedefs";

const toFault = (draft: FaultDraft): Fault => {
  const window = {
    nodeId: draft.targetId,
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
    case "region-down":
      return {
        kind: "region-down",
        groupId: draft.targetId,
        at: draft.at,
        ...(draft.until !== null ? { until: draft.until } : {}),
      };
    case "cache-flush":
      return { kind: "cache-flush", nodeId: draft.targetId, at: draft.at };
    case "rollout":
      return {
        kind: "rollout",
        nodeId: draft.targetId,
        at: draft.at,
        release: draft.release,
        migrates: draft.migrates,
      };
    case "secret-rotation":
      return {
        kind: "secret-rotation",
        nodeId: draft.targetId,
        at: draft.at,
      };
  }
};

export const liveFaults = (
  draft: ScenarioDraft,
  graph: DesignGraph,
): FaultDraft[] => {
  const nodes = new Set(graph.nodes.map((node) => node.id));
  const groups = new Set(graph.groups.map((group) => group.id));

  return draft.faults.filter((fault) =>
    fault.kind === "region-down"
      ? groups.has(fault.targetId)
      : nodes.has(fault.targetId),
  );
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
