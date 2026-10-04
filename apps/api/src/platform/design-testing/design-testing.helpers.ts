import { drillRunner, runTests, scoreSubmission } from "@repo/design";

import type { DesignTestRequest, DesignTestResult } from "./ports";

export const testDesign = ({
  problem,
  graph,
  include,
  seeds,
}: DesignTestRequest): DesignTestResult => {
  const runner = drillRunner(problem, graph, { seeds });

  return {
    score: scoreSubmission(problem, graph, runner),
    report: runTests(problem, graph, { include, seeds, runner }),
  };
};
