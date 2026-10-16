import type {
  ProblemProgressModel,
  ProblemSummaryModel,
} from "@repo/api-client";
import { TRACK_LABELS } from "@repo/design";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Circle, CircleCheck, CircleDashed } from "lucide-react";

import { RatingBadge } from "@/features/discussion";
import { SOLVED_SCORE } from "@/features/problems/constants";
import { formatSubmittedAt, scoreTone } from "@/features/problems/utils";

import { DifficultyBadge } from "./DifficultyBadge";
import { ProblemCredit } from "./ProblemCredit";

interface ProblemRowProps {
  problem: ProblemSummaryModel;
  progress?: ProblemProgressModel;
}

function StatusMark({ progress }: { progress?: ProblemProgressModel }) {
  if (!progress || progress.submissions === 0) {
    return (
      <Circle
        aria-label="Not tried yet"
        className="size-4 text-muted-foreground/60"
      />
    );
  }

  return progress.bestScore >= SOLVED_SCORE ? (
    <CircleCheck aria-label="Solved" className="size-4 text-success" />
  ) : (
    <CircleDashed aria-label="Tried" className="size-4 text-warning" />
  );
}

export function ProblemRow({ problem, progress }: ProblemRowProps) {
  const tried = progress !== undefined && progress.submissions > 0;

  return (
    <li className="relative grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 py-4 transition-colors hover:bg-muted/40 has-[a:focus-visible]:bg-muted/40 sm:px-5 lg:grid-cols-[1rem_minmax(0,1fr)_8rem_5.5rem_6.5rem] lg:items-center">
      <span className="pt-0.5 lg:pt-0">
        <StatusMark progress={progress} />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <Link
          to="/problems/$slug"
          params={{ slug: problem.slug }}
          className="font-semibold tracking-[-0.015em] outline-none after:absolute after:inset-0"
        >
          {problem.title}
        </Link>
        <p className="text-sm text-muted-foreground text-pretty lg:truncate">
          {problem.summary}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <ul aria-label="Tags" className="flex flex-wrap gap-1">
            {problem.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-subtle-foreground"
              >
                {tag}
              </li>
            ))}
          </ul>
          <div className="relative z-10">
            <ProblemCredit problem={problem} />
          </div>
          <RatingBadge
            rating={problem.rating}
            commentCount={problem.commentCount}
          />
        </div>
      </div>
      <div className="col-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm lg:contents">
        <span className="text-muted-foreground">
          {TRACK_LABELS[problem.track]}
        </span>
        <span>
          <DifficultyBadge difficulty={problem.difficulty} />
        </span>
        <span className="lg:text-right">
          {progress?.lockedUntil ? (
            <span className="text-warning-foreground">
              Counts {formatSubmittedAt(progress.lockedUntil)}
            </span>
          ) : tried ? (
            <span className="text-muted-foreground">
              Best{" "}
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  scoreTone(progress.bestScore),
                )}
              >
                {progress.bestScore}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground lg:sr-only">Not tried</span>
          )}
        </span>
      </div>
    </li>
  );
}
