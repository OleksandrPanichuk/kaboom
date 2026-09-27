import type { EvaluationResult, LoadScenario } from "@repo/design";

import type { SimulationSummary } from "./simulation-run.entity";

export const summarize = (
  result: EvaluationResult,
  scenario: LoadScenario,
): SimulationSummary => {
  const clients: SimulationSummary["clients"] = {};

  for (const step of result.steps) {
    for (const [id, client] of Object.entries(step.clients)) {
      const seen = clients[id];

      clients[id] = {
        minAvailability: Math.min(
          seen?.minAvailability ?? 1,
          client.availability,
        ),
        maxP99: Math.max(seen?.maxP99 ?? 0, client.p99),
      };
    }
  }

  return {
    steps: result.steps.length,
    stepSeconds: scenario.stepSeconds,
    clients,
  };
};
