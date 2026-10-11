import {
  checkPublishable,
  drillRunner,
  flattenBundle,
  runTests,
  scoreSubmission,
} from "@repo/scoring";

import type {
  DesignTesterTask,
  DesignTestRequest,
  DesignTestResult,
} from "./ports";

export const testDesign = ({
  problem,
  bundle,
  include,
  seeds,
}: DesignTestRequest): DesignTestResult => {
  const graph = flattenBundle(bundle);
  const runner = drillRunner(problem, graph, { seeds });

  return {
    score: scoreSubmission(problem, graph, runner),
    report: runTests(problem, graph, { include, seeds, runner }),
  };
};

export const runTask = (task: DesignTesterTask): unknown =>
  task.task === "test"
    ? testDesign(task.request)
    : checkPublishable(task.content);
