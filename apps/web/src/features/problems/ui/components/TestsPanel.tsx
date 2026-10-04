import type { TestReportModel } from "@repo/api-client";
import { FlaskConical } from "lucide-react";

import type { ReplayRequest } from "@/features/designs";
import type { ProblemOutcome } from "@/features/problems/typedefs";

import { PanelSection } from "./PanelSection";
import { LatestScoreBreakdown } from "./ScoreBreakdown";
import { TestReport } from "./TestReport";

interface TestsPanelProps {
  slug: string;
  outcome: ProblemOutcome | null;
  previous: TestReportModel | null;
  revision: number;
  error: string | null;
  labelOf: (nodeId: string) => string;
  onReplay: (request: ReplayRequest) => void;
}

export function TestsPanel({
  slug,
  outcome,
  previous,
  revision,
  error,
  labelOf,
  onReplay,
}: TestsPanelProps) {
  if (!outcome) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
          <FlaskConical aria-hidden="true" className="size-4" />
        </span>
        <p className="text-sm font-medium">No results yet</p>
        <p className="text-sm leading-5 text-muted-foreground text-pretty">
          Run tests to try your design against the public tests. Submit to score
          it against every test, hidden ones included.
        </p>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const tested =
    outcome.kind === "run" ? outcome.run.revision : outcome.submission.revision;

  return (
    <div className="flex flex-col">
      {error ? (
        <p role="alert" className="border-b px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {tested !== revision ? (
        <p className="border-b bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
          These results are for revision {tested}. The design has changed since.
        </p>
      ) : null}
      {outcome.kind === "run" ? (
        <PanelSection title="Public tests">
          <TestReport
            report={outcome.run.report}
            previous={previous}
            labelOf={labelOf}
            onReplay={onReplay}
          />
        </PanelSection>
      ) : (
        <PanelSection title="Submission">
          <LatestScoreBreakdown
            slug={slug}
            submission={outcome.submission}
            labelOf={labelOf}
            onReplay={onReplay}
          />
        </PanelSection>
      )}
    </div>
  );
}
