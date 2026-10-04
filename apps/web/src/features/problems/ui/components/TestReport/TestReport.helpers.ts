import type { TestReportModel } from "@repo/api-client";
import { type LoadScenarioInput, LoadScenarioSchema } from "@repo/design";

export type TestChange = "new-failure" | "fixed";

export const changesSince = (
  report: TestReportModel,
  previous: TestReportModel | null,
): Map<string, TestChange> => {
  const before = new Map(
    (previous?.tests ?? []).map((test) => [test.id, test.status]),
  );

  return new Map(
    report.tests.flatMap((test): Array<[string, TestChange]> => {
      const was = before.get(test.id);

      if (was === "passed" && test.status === "failed") {
        return [[test.id, "new-failure"]];
      }

      if (was === "failed" && test.status === "passed") {
        return [[test.id, "fixed"]];
      }

      return [];
    }),
  );
};

export const replayScenario = (replay: unknown): LoadScenarioInput | null => {
  const parsed = LoadScenarioSchema.safeParse(replay);

  return parsed.success ? parsed.data : null;
};

export const formatDuration = (ms: number): string =>
  ms >= 1_000
    ? `${(ms / 1_000).toFixed(1)} s`
    : `${ms < 1 ? "<1" : Math.round(ms)} ms`;
