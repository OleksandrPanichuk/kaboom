import type { DesignGraph } from "../graph";
import { evaluateLoad } from "./load";
import type { EvaluationResult } from "./result";
import type { LoadScenarioInput } from "./scenario";

export type ScenarioInput = LoadScenarioInput;

export const evaluate = (
  graph: DesignGraph,
  scenario: ScenarioInput,
): EvaluationResult => {
  switch (scenario.kind) {
    case "load":
      return evaluateLoad(graph, scenario);
  }
};
