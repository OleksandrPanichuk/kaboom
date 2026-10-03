import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";

import { progressQuery, scoreTone } from "@/features/problems";

export function ProblemsTable() {
  const { data: progress } = useSuspenseQuery(progressQuery);

  return (
    <section aria-labelledby="problems-title" className="flex flex-col gap-3">
      <h2
        id="problems-title"
        className="text-lg font-semibold tracking-[-0.02em]"
      >
        Challenges
      </h2>
      {progress.problems.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-black/10 px-4 py-6 text-sm text-muted-foreground">
          Nothing submitted yet.{" "}
          <Link
            to="/problems"
            className="font-medium text-indigo-700 hover:underline"
          >
            Pick a problem
          </Link>{" "}
          to start.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/[0.07] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Problem</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                  Difficulty
                </th>
                <th className="px-4 py-2.5 text-right font-medium">Best</th>
                <th className="px-4 py-2.5 text-right font-medium">Points</th>
                <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">
                  Submissions
                </th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {progress.problems.map((problem) => (
                <tr key={problem.slug} className="border-t">
                  <td className="px-4 py-2.5">
                    <Link
                      to="/problems/$slug"
                      params={{ slug: problem.slug }}
                      className="font-medium hover:text-indigo-700 hover:underline"
                    >
                      {problem.title}
                    </Link>
                    {problem.lockedUntil ? (
                      <span className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">
                        Locked
                      </span>
                    ) : null}
                  </td>
                  <td className="hidden px-4 py-2.5 capitalize text-muted-foreground sm:table-cell">
                    {problem.difficulty}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-2.5 text-right font-semibold",
                      scoreTone(problem.bestScore),
                    )}
                  >
                    {problem.bestScore}
                  </td>
                  <td className="px-4 py-2.5 text-right">{problem.points}</td>
                  <td className="hidden px-4 py-2.5 text-right text-muted-foreground sm:table-cell">
                    {problem.submissions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
