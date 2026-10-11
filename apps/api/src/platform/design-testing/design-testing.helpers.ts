import {
  checkPublishable,
  drillRunner,
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

export const runTask = (task: DesignTesterTask): unknown =>
  task.task === "test"
    ? testDesign(task.request)
    : checkPublishable(task.content);
