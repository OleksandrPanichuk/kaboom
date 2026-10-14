import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { FlaskConical, History, MessagesSquare } from "lucide-react";

import { scoreTone } from "@/features/problems";
import { activityQuery } from "@/features/progress/api";

const when = (at: string) =>
  new Date(at).toLocaleDateString("en", { month: "short", day: "numeric" });

const CHIP = "rounded-md px-1.5 py-0.5 text-[11px] font-medium";

export function ActivityList() {
  const { data } = useSuspenseQuery(activityQuery);

  return (
    <section aria-labelledby="activity-title" className="flex flex-col gap-3">
      <h2
        id="activity-title"
        className="text-lg font-semibold tracking-[-0.02em]"
      >
        Recent activity
      </h2>
      {data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 px-4 py-10 text-center">
          <History
            aria-hidden="true"
            className="size-5 text-muted-foreground"
          />
          <p className="text-sm text-muted-foreground text-pretty">
            Reviewed interviews and submitted challenges show up here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          {data.items.map((item) => {
            const interview = item.kind === "interview";
            const pending = item.reviewStatus === "pending";

            return (
              <li
                key={`${item.kind}-${item.id}`}
                className="relative flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 has-[a:focus-visible]:bg-muted/40"
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg border",
                    interview
                      ? "border-interactive-border/60 bg-interactive-surface text-interactive-foreground"
                      : "border-border bg-muted/60 text-muted-foreground",
                  )}
                >
                  {interview ? (
                    <MessagesSquare aria-hidden="true" className="size-4" />
                  ) : (
                    <FlaskConical aria-hidden="true" className="size-4" />
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {interview ? (
                    <Link
                      to="/interviews/$interviewId/review"
                      params={{ interviewId: item.id }}
                      className="line-clamp-2 text-sm font-medium break-words outline-none after:absolute after:inset-0"
                    >
                      {item.problem.title}
                    </Link>
                  ) : (
                    <Link
                      to="/problems/$slug"
                      params={{ slug: item.problem.slug }}
                      className="line-clamp-2 text-sm font-medium break-words outline-none after:absolute after:inset-0"
                    >
                      {item.problem.title}
                    </Link>
                  )}
                  <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {interview ? "Interview" : "Challenge"} · {when(item.at)}
                    </span>
                    {!item.counted ? (
                      <span className={cn(CHIP, "bg-muted")}>Not counted</span>
                    ) : null}
                    {pending ? (
                      <span
                        className={cn(
                          CHIP,
                          "bg-interactive-surface text-interactive-foreground",
                        )}
                      >
                        Review pending
                      </span>
                    ) : null}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-base font-semibold tabular-nums",
                    item.score === null
                      ? "text-muted-foreground"
                      : scoreTone(item.score),
                  )}
                >
                  {item.score ?? "–"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
