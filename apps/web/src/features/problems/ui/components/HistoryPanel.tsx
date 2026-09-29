import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { ChevronRight, History } from "lucide-react";

import { submissionsQuery } from "@/features/problems/api";
import { formatSubmittedAt, scoreTone } from "@/features/problems/utils";

import { ScoreBreakdown } from "./ScoreBreakdown";

interface HistoryPanelProps {
  slug: string;
}

export function HistoryPanel({ slug }: HistoryPanelProps) {
  const { data, isPending, isError } = useQuery({
    ...submissionsQuery(slug),
    refetchInterval: (query) =>
      query.state.data?.items.some((item) => item.reviewStatus === "pending")
        ? 3_000
        : false,
  });

  if (isPending) {
    return (
      <p role="status" className="px-4 py-6 text-sm text-muted-foreground">
        Loading submissions…
      </p>
    );
  }

  if (isError) {
    return (
      <p role="alert" className="px-4 py-6 text-sm text-destructive">
        Could not load your submissions.
      </p>
    );
  }

  if (data.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <span className="grid size-9 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
          <History aria-hidden="true" className="size-4" />
        </span>
        <p className="text-sm font-medium">Nothing submitted yet</p>
        <p className="text-sm leading-5 text-muted-foreground text-pretty">
          Every submission is kept here. Your best score is the one that counts,
          and a design scoring 80 or more may be shown to others without your
          name.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col">
      {data.items.map((submission) => (
        <li key={submission.id} className="border-b">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
              <ChevronRight
                aria-hidden="true"
                className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
              />
              <span
                className={cn(
                  "w-8 shrink-0 font-semibold tabular-nums",
                  scoreTone(submission.score),
                )}
              >
                {submission.score}
              </span>
              {!submission.counted ? (
                <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">
                  Not counted
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                Revision {submission.revision} ·{" "}
                <time dateTime={submission.createdAt}>
                  {formatSubmittedAt(submission.createdAt)}
                </time>
              </span>
            </summary>
            <div className="px-4 pb-4">
              <ScoreBreakdown submission={submission} />
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
