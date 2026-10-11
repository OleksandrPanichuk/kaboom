import { type DesignGraph, emptyGraph } from "@repo/design";

import {
  chaosBaseline,
  chaosCases,
  chaosSettings,
  chaosWindow,
  loadedNodes,
} from "./chaos";
import { runDrill } from "./drills";
import { drillScenario } from "./resolve";
import type { ProblemContent } from "./schema";
import { runCost } from "./variation";

export const MAX_PROBLEM_STEPS = 2_000;

export const MAX_REFERENCE_WORK = 50_000;

export interface DrillSteps {
  index: number;
  id: string;
  steps: number;
}

export interface ProblemSteps {
  drills: DrillSteps[];
  chaos: number;
  total: number;
}

const stepsOf = (scenario: Parameters<typeof runCost>[1]) =>
  runCost(emptyGraph(), scenario);

export const problemSteps = (problem: ProblemContent): ProblemSteps => {
  const drills = problem.drills.flatMap((drill, index) =>
    drill.kind === "load"
      ? [
          {
            index,
            id: drill.id,
            steps: stepsOf(drillScenario(drill, problem.baseline)),
          },
        ]
      : [],
  );
  const settings = chaosSettings(problem);
  const chaos =
    chaosBaseline(problem) && settings.enabled
      ? stepsOf(chaosWindow(settings))
      : 0;

  return {
    drills,
    chaos,
    total: drills.reduce((sum, drill) => sum + drill.steps, 0) + chaos,
  };
};

export const asDrawnWork = (
  problem: ProblemContent,
  graph: DesignGraph,
): number => {
  const drills = problem.drills.reduce(
    (sum, drill) =>
      drill.kind === "load"
        ? sum + runCost(graph, drillScenario(drill, graph))
        : sum,
    0,
  );
  const baseline = chaosBaseline(problem);
  const settings = chaosSettings(problem);

  if (!baseline || !settings.enabled) return drills;

  const base = runDrill(baseline, graph);
  const cases = base.result
    ? chaosCases(graph, settings, loadedNodes(base.result)).length
    : 0;

  return drills + cases * runCost(graph, chaosWindow(settings));
};
