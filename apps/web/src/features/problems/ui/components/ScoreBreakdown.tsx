import type { SubmissionModel } from "@repo/api-client";
import { cn } from "cn";
import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";

import { ScoreDots } from "@/components/ScoreDots";
import type { ReplayRequest } from "@/features/designs";
import { useLatestSubmission } from "@/features/problems/hooks";
import { scoreTone } from "@/features/problems/utils";

import { DrillResults } from "./DrillResults";
import { TestReport } from "./TestReport";

interface ScoreBreakdownProps {
  submission: SubmissionModel;
  labelOf?: (nodeId: string) => string;
  onReplay?: (request: ReplayRequest) => void;
}

const asIs = (nodeId: string) => nodeId;

const DIMENSIONS: Record<string, string> = {
  design: "Core design",
  scaling: "Scaling",
  reliability: "Reliability",
  delivery: "Delivery",
  operability: "Operability",
};

export function LatestScoreBreakdown({
  slug,
  submission,
  ...rest
}: ScoreBreakdownProps & { slug: string }) {
  return (
    <ScoreBreakdown
      submission={useLatestSubmission(slug, submission)}
      {...rest}
    />
  );
}

export function ScoreBreakdown({
  submission,
  labelOf = asIs,
  onReplay,
}: ScoreBreakdownProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-3xl font-semibold tracking-[-0.04em] tabular-nums",
            scoreTone(submission.score),
          )}
        >
          {submission.score}
        </span>
        <span className="text-sm text-muted-foreground tabular-nums">
          / 100 · revision {submission.revision}
        </span>
      </p>
      <DesignReviewNote submission={submission} />
      {!submission.counted ? (
        <p className="-mt-3 text-sm text-amber-800">
          Not counted toward points: you looked at other solutions within the
          seven days before.
        </p>
      ) : null}
      {submission.hintPenalty > 0 ? (
        <p className="-mt-3 text-sm text-muted-foreground tabular-nums">
          {submission.hintPenalty} points off for hints
        </p>
      ) : null}
      <ul className="flex flex-col gap-2.5">
        {submission.items.map((item) => (
          <li key={item.key} className="flex min-w-0 gap-2.5">
            {item.passed ? (
              <CircleCheck
                aria-label="Earned"
                className="mt-0.5 size-4 shrink-0 text-emerald-600"
              />
            ) : (
              <CircleX
                aria-label="Missed"
                className="mt-0.5 size-4 shrink-0 text-red-600"
              />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 font-medium">{item.title}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {Math.round(
                    item.weight * (item.ratio ?? (item.passed ? 1 : 0)),
                  )}{" "}
                  / {item.weight}
                </span>
              </p>
              <p className="text-sm leading-5 text-muted-foreground text-pretty">
                {item.evidence}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {submission.review ? (
        <div className="flex flex-col gap-3 rounded-xl border border-black/[0.07] bg-zinc-50/60 p-3">
          <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Design review
          </h4>
          <p className="text-sm leading-6 text-zinc-700 text-pretty">
            {submission.review.summary}
          </p>
          <ul className="flex flex-col gap-2.5">
            {submission.review.items.map((item) => (
              <li key={item.dimension} className="flex flex-col gap-0.5">
                <p className="flex items-center justify-between gap-3 text-sm font-medium">
                  {DIMENSIONS[item.dimension] ?? item.dimension}
                  <ScoreDots score={item.score} />
                </p>
                <p className="text-sm leading-5 text-muted-foreground text-pretty">
                  {item.rationale}
                </p>
              </li>
            ))}
          </ul>
          {submission.review.improvements.length > 0 ? (
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-5 text-zinc-700 marker:text-zinc-300">
              {submission.review.improvements.map((improvement) => (
                <li key={improvement} className="text-pretty">
                  {improvement}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {submission.tests ? (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Tests
          </h4>
          <TestReport
            report={submission.tests}
            labelOf={labelOf}
            onReplay={onReplay}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Drills
          </h4>
          <DrillResults drills={submission.drills} />
        </div>
      )}
    </div>
  );
}

function DesignReviewNote({ submission }: ScoreBreakdownProps) {
  if (submission.reviewStatus === "pending") {
    return (
      <p
        role="status"
        className="-mt-3 flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <LoaderCircle
          aria-hidden="true"
          className="size-3.5 animate-spin text-indigo-600"
        />
        Reviewing the design. The score may move by up to 30 points.
      </p>
    );
  }

  if (submission.reviewStatus === "reviewed") {
    return (
      <p className="-mt-3 text-sm text-muted-foreground tabular-nums">
        Checks {submission.deterministicScore} · design review{" "}
        {submission.reviewScore}, weighted 70 / 30
      </p>
    );
  }

  if (submission.reviewStatus === "failed") {
    return (
      <p className="-mt-3 text-sm text-muted-foreground">
        The design review could not be written, so the score is the checks
        alone.
      </p>
    );
  }

  return null;
}
