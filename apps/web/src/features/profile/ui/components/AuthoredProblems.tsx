import type { PublicProfileModel } from "@repo/api-client";
import { TRACK_LABELS } from "@repo/design";
import { Link } from "@tanstack/react-router";

import { DifficultyBadge } from "@/features/problems";

interface AuthoredProblemsProps {
  problems: PublicProfileModel["problems"];
}

const day = (at: string) =>
  new Date(at).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function AuthoredProblems({ problems }: AuthoredProblemsProps) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {problems.map((problem) => (
        <li
          key={problem.slug}
          className="relative flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Link
              to="/problems/$slug"
              params={{ slug: problem.slug }}
              className="font-medium outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
            >
              {problem.title}
            </Link>
            <p className="text-sm text-muted-foreground text-pretty sm:truncate">
              {problem.summary}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{TRACK_LABELS[problem.track]}</span>
            <DifficultyBadge difficulty={problem.difficulty} />
            <span className="tabular-nums">Solved by {problem.solvers}</span>
            {problem.publishedAt ? (
              <span className="tabular-nums">{day(problem.publishedAt)}</span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
