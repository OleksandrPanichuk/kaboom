import { FlaskConical } from "lucide-react";

import type { ProblemOutcome } from "@/features/problems/typedefs";

import { DrillResults } from "./DrillResults";
import { PanelSection } from "./PanelSection";
import { LatestScoreBreakdown } from "./ScoreBreakdown";

interface TestsPanelProps {
  slug: string;
  outcome: ProblemOutcome | null;
  revision: number;
  error: string | null;
}

export function TestsPanel({
  slug,
  outcome,
  revision,
  error,
}: TestsPanelProps) {
  if (!outcome) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
          <FlaskConical aria-hidden="true" className="size-4" />
        </span>
        <p className="text-sm font-medium">No results yet</p>
        <p className="text-sm leading-5 text-muted-foreground text-pretty">
          Run tests to try your design against the public drills. Submit to
          score it against every drill, hidden ones included.
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
  const passed =
    outcome.kind === "run"
      ? outcome.run.drills.filter((drill) => drill.passed).length
      : 0;

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
        <PanelSection
          title={`Public drills · ${passed} of ${outcome.run.drills.length} passed`}
        >
          <DrillResults drills={outcome.run.drills} />
        </PanelSection>
      ) : (
        <PanelSection title="Submission">
          <LatestScoreBreakdown slug={slug} submission={outcome.submission} />
        </PanelSection>
      )}
    </div>
  );
}
