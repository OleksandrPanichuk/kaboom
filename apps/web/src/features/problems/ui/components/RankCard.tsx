import { useSuspenseQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";

import { progressQuery } from "@/features/problems/api";

export function RankCard() {
  const { data: progress } = useSuspenseQuery(progressQuery);
  const { rank } = progress;
  const share =
    rank.nextPoints === null
      ? 1
      : (progress.points - rank.floorPoints) /
        Math.max(1, rank.nextPoints - rank.floorPoints);

  return (
    <section
      aria-label="Your rank"
      className="flex items-center gap-4 rounded-2xl border border-black/[0.07] bg-white p-4 shadow-[0_12px_36px_-28px_rgba(24,24,27,0.45)] sm:p-5"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-indigo-200/60 bg-indigo-50 text-indigo-700">
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
          className="h-1.5 overflow-hidden rounded-full bg-zinc-100"
        >
          <div
            className="h-full rounded-full bg-indigo-500"
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
