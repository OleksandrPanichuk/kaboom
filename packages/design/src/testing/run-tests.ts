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
import { HOLDS_SHARE, statusOf, type Variation } from "./variation";

export const TEST_SUITES = [
  "functional",
  "load",
  "faults",
  "chaos",
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
  variation: TestVariation | null;
}

export interface TestVariation {
  passed: number;
  total: number;
  worstSeed: number | null;
  varyFaults: boolean;
}

export interface TestReport {
  tests: TestResult[];
  summary: Record<TestStatus, number>;
  durationMs: number;
}

export interface RunTestsOptions {
  include: "public" | "all";
  seeds?: number;
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
    case "chaos-coverage":
      return "chaos";
    case "serves-reads": {
      const drill = problem.drills.find((item) => item.id === check.drillId);

      return drill ? suiteOfDrill(drill) : "functional";
    }
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

export const HOLDS_LABEL = "Holds when traffic and capacity vary";

const round = (ms: number) => Math.round(ms * 100) / 100;

const summary = (
  variation: Variation | null,
  varyFaults: boolean,
): TestVariation | null =>
  variation && variation.total > 0
    ? {
        passed: variation.passed,
        total: variation.total,
        worstSeed: variation.worstSeed,
        varyFaults,
      }
    : null;

const holds = (variation: Variation | null): Assertion[] => {
  if (!variation || variation.total === 0) return [];

  const needed = Math.ceil(variation.total * HOLDS_SHARE);

  return [
    assertion({
      label: HOLDS_LABEL,
      expected: `${needed} of ${variation.total} runs`,
      actual: `${variation.passed} of ${variation.total}`,
      passed: variation.passed >= needed,
      at: variation.worst?.at ?? null,
      nodeIds: variation.worst?.nodeIds ?? [],
      message: `Fails ${variation.total - variation.passed} of ${variation.total} runs with traffic, faults and capacity varied${variation.worst?.message ? `; in run ${variation.worstSeed}: ${variation.worst.message}` : "."}`,
    }),
  ];
};

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
  {
    include,
    seeds = 0,
    runner = drillRunner(problem, graph, { seeds }),
  }: RunTestsOptions,
): TestReport => {
  const started = performance.now();
  const shown = (visibility: "public" | "hidden") =>
    include === "all" || visibility === "public";
  const drills = problem.drills
    .filter((drill) => shown(drill.visibility))
    .map((drill): TestResult => {
      const outcome = runner.drill(drill.id)!;
      const variation = runner.variation(drill.id);

      return {
        id: `drill:${drill.id}`,
        suite: suiteOfDrill(drill),
        title: drill.title,
        description: drill.description,
        visibility: drill.visibility,
        status: statusOf(outcome.passed, variation),
        assertions: [...outcome.assertions, ...holds(variation)],
        durationMs: round(runner.durationOf(drill.id)),
        replay:
          drill.visibility === "public" ? (outcome.scenario ?? null) : null,
        variation: summary(variation, true),
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
        variation: null,
      };
    });
  const chaos = runner
    .chaos()
    .map(
      ({
        chaos: item,
        outcome,
        variation,
        skipped,
        durationMs,
      }): TestResult => ({
        id: item.id,
        suite: "chaos",
        title: item.title,
        description: skipped ?? "",
        visibility: "public",
        status: outcome ? statusOf(outcome.passed, variation) : "skipped",
        assertions: [...(outcome?.assertions ?? []), ...holds(variation)],
        durationMs: round(durationMs),
        replay: outcome?.scenario ?? null,
        variation: summary(variation, false),
      }),
    );
  const tests = [...drills, ...checks, ...chaos].sort(
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
          variation: test.variation && { ...test.variation, worstSeed: null },
        }
      : test,
  ),
});
