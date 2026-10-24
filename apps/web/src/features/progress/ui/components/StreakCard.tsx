import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";

import { achievementsQuery } from "@/features/progress/api";
import { streakHeadline, streakNudge } from "@/features/progress/utils";

export function StreakCard() {
  const { data } = useQuery(achievementsQuery);

  if (!data) return null;

  const { streak } = data;
  const lit = streak.current > 0;

  return (
    <section
      aria-label="Practice streak"
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
    >
      <span
        aria-hidden="true"
        className={
          lit
            ? "grid size-11 shrink-0 place-items-center rounded-xl border border-warning-border/60 bg-warning-surface text-warning-foreground"
            : "grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-muted text-muted-foreground"
        }
      >
        <Flame className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="font-semibold tracking-[-0.01em]">
          {streakHeadline(streak)}
        </p>
        <p className="text-sm leading-5 text-muted-foreground text-pretty">
          {streakNudge(streak)}
        </p>
      </div>
    </section>
  );
}
