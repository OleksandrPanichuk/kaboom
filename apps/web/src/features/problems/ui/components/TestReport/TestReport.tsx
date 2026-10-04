import type { TestReportModel } from "@repo/api-client";
import { TEST_SUITES } from "@repo/design";

import type { ReplayRequest } from "@/features/designs";

import { StatusIcon } from "./StatusIcon";
import { STATUS_LABELS, SUITE_LABELS } from "./TestReport.constants";
import { changesSince, formatDuration } from "./TestReport.helpers";
import { TestRow } from "./TestRow";

interface TestReportProps {
  report: TestReportModel;
  previous?: TestReportModel | null;
  labelOf: (nodeId: string) => string;
  onReplay?: (request: ReplayRequest) => void;
}

const SUMMARY_ORDER = ["passed", "failed", "flaky", "skipped"] as const;

export function TestReport({
  report,
  previous = null,
  labelOf,
  onReplay,
}: TestReportProps) {
  const changes = changesSince(report, previous);
  const suites = TEST_SUITES.map((suite) => ({
    suite,
    tests: report.tests.filter((test) => test.suite === suite),
  })).filter(({ tests }) => tests.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
        {SUMMARY_ORDER.filter(
          (status) => report.summary[status] > 0 || status === "passed",
        ).map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <StatusIcon status={status} className="size-3.5" />
            <span className="font-medium tabular-nums">
              {report.summary[status]}
            </span>
            <span className="text-muted-foreground">
              {STATUS_LABELS[status].toLowerCase()}
            </span>
          </span>
        ))}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {formatDuration(report.durationMs)}
        </span>
      </div>
      {suites.map(({ suite, tests }) => {
        const passed = tests.filter((test) => test.status === "passed").length;

        return (
          <section key={suite} className="flex flex-col gap-1">
            <h4 className="flex items-baseline justify-between px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {SUITE_LABELS[suite]}
              <span className="font-normal tracking-normal normal-case tabular-nums">
                {passed} of {tests.length} passed
              </span>
            </h4>
            <ul className="flex flex-col">
              {tests.map((test) => (
                <TestRow
                  key={test.id}
                  test={test}
                  change={changes.get(test.id) ?? null}
                  labelOf={labelOf}
                  onReplay={onReplay}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
