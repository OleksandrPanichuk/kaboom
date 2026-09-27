import type { SubmissionModel } from "@repo/api-client";
import { cn } from "cn";
import { CircleCheck, CircleX } from "lucide-react";

import { scoreTone } from "@/features/problems/utils";

import { DrillResults } from "./DrillResults";

interface ScoreBreakdownProps {
  submission: SubmissionModel;
}

export function ScoreBreakdown({ submission }: ScoreBreakdownProps) {
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
                  {item.passed ? item.weight : 0} / {item.weight}
                </span>
              </p>
              <p className="text-sm leading-5 text-muted-foreground text-pretty">
                {item.evidence}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Drills
        </h4>
        <DrillResults drills={submission.drills} />
      </div>
    </div>
  );
}
