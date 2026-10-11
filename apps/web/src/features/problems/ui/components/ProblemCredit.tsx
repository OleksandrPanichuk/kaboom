import type { ProblemSummaryModel } from "@repo/api-client";
import { Link } from "@tanstack/react-router";
import { GitFork } from "lucide-react";

interface ProblemCreditProps {
  problem: Pick<ProblemSummaryModel, "author" | "forkedFrom">;
}

export function ProblemCredit({ problem }: ProblemCreditProps) {
  if (!problem.author && !problem.forkedFrom) return null;

  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
      {problem.author ? (
        <>
          by{" "}
          <Link
            to="/u/$handle"
            params={{ handle: problem.author.handle }}
            className="font-medium text-indigo-700 hover:underline"
          >
            {problem.author.displayName}
          </Link>
        </>
      ) : null}
      {problem.forkedFrom ? (
        <span className="inline-flex items-center gap-1">
          <GitFork aria-hidden="true" className="size-3" />
          from{" "}
          <Link
            to="/problems/$slug"
            params={{ slug: problem.forkedFrom.slug }}
            className="font-medium text-indigo-700 hover:underline"
          >
            {problem.forkedFrom.title}
          </Link>
        </span>
      ) : null}
    </p>
  );
}
