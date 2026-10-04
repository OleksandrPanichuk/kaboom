import type { LoadScenarioInput } from "../evaluate/scenario";
import type { DesignGraph } from "../graph";
import type {
  CheckRef,
  Drill,
  ProblemContent,
  RubricItem,
} from "../problems/schema";
import { type DrillRunner, drillRunner, judgeCheck } from "../problems/score";
import { type Assertion, assertion } from "./assertion";

export const TEST_SUITES = [
  "functional",
  "load",
  "faults",
  "constraints",
  "hidden",
] as const;
export type TestSuite = (typeof TEST_SUITES)[number];

export const TEST_STATUSES = ["passed", "failed", "flaky", "skipped"] as const;
export type TestStatus = (typeof TEST_STATUSES)[number];

export interface TestResult {
  id: string;
  suite: TestSuite;
  title: string;
  description: string;
  visibility: "public" | "hidden";
  status: TestStatus;
  assertions: Assertion[];
  durationMs: number;
  replay: LoadScenarioInput | null;
}

export interface TestReport {
  tests: TestResult[];
  summary: Record<TestStatus, number>;
  durationMs: number;
}

export interface RunTestsOptions {
  include: "public" | "all";
  runner?: DrillRunner;
}

const suiteOfDrill = (drill: Drill): TestSuite => {
  if (drill.kind !== "load") return "functional";

  return drill.faults.length > 0 ? "faults" : "load";
};

const suiteOfCheck = (check: CheckRef, problem: ProblemContent): TestSuite => {
  switch (check.check) {
    case "no-lint":
      return "constraints";
    case "no-finding-under-drill": {
      const drill = problem.drills.find((item) => item.id === check.drillId);

      return drill ? suiteOfDrill(drill) : "functional";
    }
    case "drill-passes":
    case "has-node-kind":
    case "throttles":
    case "watches":
      return "functional";
  }
};

const visibilityOfCheck = (
  check: CheckRef,
  problem: ProblemContent,
): "public" | "hidden" => {
  if (!("drillId" in check)) return "public";

  const drill = problem.drills.find((item) => item.id === check.drillId);

  return drill?.visibility ?? "public";
};

const round = (ms: number) => Math.round(ms * 100) / 100;

export const summarise = (
  tests: readonly TestResult[],
): Record<TestStatus, number> =>
  Object.fromEntries(
    TEST_STATUSES.map((status) => [
      status,
      tests.filter((test) => test.status === status).length,
    ]),
  ) as Record<TestStatus, number>;

export const runTests = (
  problem: ProblemContent,
  graph: DesignGraph,
  { include, runner = drillRunner(problem, graph) }: RunTestsOptions,
): TestReport => {
  const started = performance.now();
  const shown = (visibility: "public" | "hidden") =>
    include === "all" || visibility === "public";
  const drills = problem.drills
    .filter((drill) => shown(drill.visibility))
    .map((drill): TestResult => {
      const outcome = runner.drill(drill.id)!;

      return {
        id: `drill:${drill.id}`,
        suite: suiteOfDrill(drill),
        title: drill.title,
        description: drill.description,
        visibility: drill.visibility,
        status: outcome.passed ? "passed" : "failed",
        assertions: outcome.assertions,
        durationMs: round(runner.durationOf(drill.id)),
        replay:
          drill.visibility === "public" ? (outcome.scenario ?? null) : null,
      };
    });
  const checks = problem.rubric
    .filter((item) => item.check.check !== "drill-passes")
    .filter((item) =>
      include === "all"
        ? true
        : "drillId" in item.check &&
          visibilityOfCheck(item.check, problem) === "public",
    )
    .map((item: RubricItem): TestResult => {
      const checkStarted = performance.now();
      const verdict = judgeCheck(item.check, runner);

      return {
        id: `check:${item.key}`,
        suite: suiteOfCheck(item.check, problem),
        title: item.title,
        description: "",
        visibility: visibilityOfCheck(item.check, problem),
        status: verdict.passed ? "passed" : "failed",
        assertions: [
          assertion({
            label: item.title,
            expected: "yes",
            actual: verdict.passed ? "yes" : "no",
            passed: verdict.passed,
            message: verdict.evidence,
          }),
        ],
        durationMs: round(performance.now() - checkStarted),
        replay: null,
      };
    });
  const tests = [...drills, ...checks].sort(
    (a, b) => TEST_SUITES.indexOf(a.suite) - TEST_SUITES.indexOf(b.suite),
  );

  return {
    tests,
    summary: summarise(tests),
    durationMs: round(
      Math.max(
        performance.now() - started,
        tests.reduce((sum, test) => sum + test.durationMs, 0),
      ),
    ),
  };
};

export const publicReport = (report: TestReport): TestReport => ({
  ...report,
  tests: report.tests.map((test) =>
    test.visibility === "hidden"
      ? {
          ...test,
          suite: "hidden",
          description: "",
          assertions: [],
          durationMs: 0,
          replay: null,
        }
      : test,
  ),
});
