import type { TestResultModel } from "@repo/api-client";

export const SUITE_LABELS: Record<TestResultModel["suite"], string> = {
  functional: "Functional",
  load: "Load",
  faults: "Faults",
  chaos: "Chaos",
  constraints: "Constraints",
  hidden: "Hidden",
};

export const STATUS_LABELS: Record<TestResultModel["status"], string> = {
  passed: "Passed",
  failed: "Failed",
  flaky: "Flaky",
  skipped: "Skipped",
};
