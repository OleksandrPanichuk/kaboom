import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { FlaskConical, MessagesSquare } from "lucide-react";

import { scoreTone } from "@/features/problems";
import { activityQuery } from "@/features/progress/api";

const when = (at: string) =>
  new Date(at).toLocaleDateString("en", { month: "short", day: "numeric" });

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
        <p className="rounded-2xl border border-dashed border-black/10 px-4 py-6 text-sm text-muted-foreground">
          Reviewed interviews and submitted challenges show up here.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-2xl border border-black/[0.07] bg-white">
          {data.items.map((item) => {
            const interview = item.kind === "interview";
            const pending = item.reviewStatus === "pending";

            return (
              <li
                key={`${item.kind}-${item.id}`}
                className="relative flex min-w-0 items-center gap-3 px-4 py-3 hover:bg-zinc-50 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring/50"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-black/[0.07] bg-zinc-50 text-zinc-600">
                  {interview ? (
                    <MessagesSquare aria-hidden="true" className="size-4" />
                  ) : (
                    <FlaskConical aria-hidden="true" className="size-4" />
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  {interview ? (
                    <Link
                      to="/interviews/$interviewId/review"
                      params={{ interviewId: item.id }}
                      className="truncate font-medium outline-none after:absolute after:inset-0"
                    >
                      {item.problem.title}
                    </Link>
                  ) : (
                    <Link
                      to="/problems/$slug"
                      params={{ slug: item.problem.slug }}
                      className="truncate font-medium outline-none after:absolute after:inset-0"
                    >
                      {item.problem.title}
                    </Link>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {interview ? "Interview review" : "Challenge submission"} ·{" "}
                    {when(item.at)}
                    {!item.counted ? " · not counted" : ""}
                    {pending ? " · design review pending" : ""}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-lg font-semibold tabular-nums",
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
