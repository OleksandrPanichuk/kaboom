import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { CircleCheck, CircleDashed, FlaskConical, Lock } from "lucide-react";

import {
  DifficultyBadge,
  progressQuery,
  scoreTone,
  SOLVED_SCORE,
} from "@/features/problems";

export function ProblemsTable() {
  const { data: progress } = useSuspenseQuery(progressQuery);
  const count = progress.problems.length;

  return (
    <section aria-labelledby="problems-title" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="problems-title"
          className="text-lg font-semibold tracking-[-0.02em]"
        >
          Challenges
        </h2>
        {count > 0 ? (
          <p className="text-sm text-muted-foreground">{count} attempted</p>
        ) : null}
      </div>
      {count === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 px-4 py-10 text-center">
          <FlaskConical
            aria-hidden="true"
            className="size-5 text-muted-foreground"
          />
          <p className="text-sm text-muted-foreground">
            Nothing submitted yet.{" "}
            <Link
              to="/problems"
              className="font-medium text-interactive-foreground hover:underline"
            >
              Pick a problem
            </Link>{" "}
            to start.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="py-2.5 pr-3 pl-4 font-medium sm:pl-5">
                  Problem
                </th>
                <th className="hidden px-3 py-2.5 font-medium sm:table-cell">
                  Level
                </th>
                <th className="px-3 py-2.5 text-right font-medium">Best</th>
                <th className="px-3 py-2.5 text-right font-medium">Points</th>
                <th className="hidden py-2.5 pr-5 pl-3 text-right font-medium sm:table-cell">
                  Tries
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border tabular-nums">
              {progress.problems.map((problem) => {
                const solved = problem.bestScore >= SOLVED_SCORE;

                return (
                  <tr
                    key={problem.slug}
                    className="transition-colors hover:bg-muted/40"
                  >
                    <td className="py-3 pr-3 pl-4 sm:pl-5">
                      <span className="flex min-w-0 items-center gap-2.5">
                        {solved ? (
                          <CircleCheck
                            aria-label="Solved"
                            className="size-4 shrink-0 text-success"
                          />
                        ) : (
                          <CircleDashed
                            aria-label="Tried"
                            className="size-4 shrink-0 text-warning"
                          />
                        )}
                        <Link
                          to="/problems/$slug"
                          params={{ slug: problem.slug }}
                          className="font-medium tracking-[-0.01em] hover:text-interactive-foreground hover:underline"
                        >
                          {problem.title}
                        </Link>
                        {problem.lockedUntil ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-warning-surface px-1.5 py-0.5 text-xs font-medium text-warning-foreground">
                            <Lock aria-hidden="true" className="size-3" />
                            Locked
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 sm:table-cell">
                      <DifficultyBadge difficulty={problem.difficulty} />
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 text-right font-semibold",
                        scoreTone(problem.bestScore),
                      )}
                    >
                      {problem.bestScore}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {problem.points.toLocaleString("en")}
                    </td>
                    <td className="hidden py-3 pr-5 pl-3 text-right text-muted-foreground sm:table-cell">
                      {problem.submissions}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
