import type {
  ProblemProgressModel,
  ProblemSummaryModel,
} from "@repo/api-client";
import { TRACK_LABELS } from "@repo/design";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";

import { formatSubmittedAt, scoreTone } from "@/features/problems/utils";

import { DifficultyBadge } from "./DifficultyBadge";

interface ProblemCardProps {
  problem: ProblemSummaryModel;
  progress?: ProblemProgressModel;
}

export function ProblemCard({ problem, progress }: ProblemCardProps) {
  return (
    <li className="relative flex min-w-0 flex-col gap-3 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)] transition-colors hover:border-indigo-200 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring/50 sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">
            {TRACK_LABELS[problem.track]}
          </p>
          <Link
            to="/problems/$slug"
            params={{ slug: problem.slug }}
            className="font-semibold tracking-[-0.02em] outline-none after:absolute after:inset-0 after:rounded-2xl"
          >
            {problem.title}
          </Link>
          <p className="text-sm leading-5 text-muted-foreground text-pretty">
            {problem.summary}
          </p>
        </div>
        <DifficultyBadge difficulty={problem.difficulty} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <ul aria-label="Tags" className="flex min-w-0 flex-wrap gap-1.5">
          {problem.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700"
            >
              {tag}
            </li>
          ))}
        </ul>
        {progress?.lockedUntil ? (
          <p className="shrink-0 text-sm text-amber-800">
            Counts again {formatSubmittedAt(progress.lockedUntil)}
          </p>
        ) : progress && progress.submissions > 0 ? (
          <p className="shrink-0 text-sm text-muted-foreground">
            Best{" "}
            <span
              className={cn(
                "font-semibold tabular-nums",
                scoreTone(progress.bestScore),
              )}
            >
              {progress.bestScore}
            </span>
            <span className="tabular-nums"> / 100</span>
          </p>
        ) : (
          <p className="shrink-0 text-sm text-muted-foreground">
            Not solved yet
          </p>
        )}
      </div>
    </li>
  );
}
