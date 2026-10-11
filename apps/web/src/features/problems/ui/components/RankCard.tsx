import { useSuspenseQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";

import { progressQuery } from "@/features/problems/api";

interface RankCardProps {
  compact?: boolean;
}

export function RankCard({ compact = false }: RankCardProps) {
  const { data: progress } = useSuspenseQuery(progressQuery);
  const { rank } = progress;
  const share =
    rank.nextPoints === null
      ? 1
      : (progress.points - rank.floorPoints) /
        Math.max(1, rank.nextPoints - rank.floorPoints);

  if (compact) {
    return (
      <section
        aria-label="Your rank"
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 shadow-card sm:w-64"
      >
        <Trophy
          aria-hidden="true"
          className="size-4 shrink-0 text-interactive"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold">{rank.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {progress.points.toLocaleString("en")} pts
              {rank.nextName && rank.nextPoints !== null
                ? ` · ${(rank.nextPoints - progress.points).toLocaleString("en")} to ${rank.nextName}`
                : ""}
            </span>
          </p>
          <div
            role="progressbar"
            aria-label={
              rank.nextName
                ? `Progress to ${rank.nextName}`
                : "Top rank reached"
            }
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(share * 100)}
            className="h-1 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-interactive"
              style={{ width: `${Math.round(share * 100)}%` }}
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Your rank"
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-interactive-border/60 bg-interactive-surface text-interactive-foreground">
        <Trophy aria-hidden="true" className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-lg font-semibold tracking-[-0.02em]">
            {rank.name}
          </span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {progress.points.toLocaleString("en")} points
          </span>
        </p>
        <div
          role="progressbar"
          aria-label={
            rank.nextName ? `Progress to ${rank.nextName}` : "Top rank reached"
          }
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(share * 100)}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-interactive"
            style={{ width: `${Math.round(share * 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {rank.nextName && rank.nextPoints !== null
            ? `${(rank.nextPoints - progress.points).toLocaleString("en")} points to ${rank.nextName}. A problem counts once, at your best score, weighted by its difficulty.`
            : "The top rank. Every problem still counts at your best score."}
        </p>
      </div>
    </section>
  );
}
