import { type DesignGraph, evaluateLoad } from "@repo/design";
import { useDeferredValue, useMemo } from "react";

import type { ScenarioDraft } from "@/features/simulation/typedefs";
import { toScenario } from "@/features/simulation/utils";

export const useSimulation = (
  graph: DesignGraph,
  draft: ScenarioDraft,
  enabled: boolean,
) => {
  const deferredGraph = useDeferredValue(graph);
  const deferredDraft = useDeferredValue(draft);
  const scenario = useMemo(
    () => toScenario(deferredDraft, deferredGraph),
    [deferredDraft, deferredGraph],
  );
  const result = useMemo(
    () => (enabled ? evaluateLoad(deferredGraph, scenario) : null),
    [deferredGraph, scenario, enabled],
  );

  return {
    scenario,
    result,
    stale: deferredGraph !== graph || deferredDraft !== draft,
  };
};
