import type { WeeklyChallengeModel } from "@repo/api-client";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Users } from "lucide-react";

import { UserAvatar } from "@/features/profile";

interface WeeklyStandingsProps {
  entries: WeeklyChallengeModel["entries"];
}

const PODIUM = 3;

export function WeeklyStandings({ entries }: WeeklyStandingsProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 px-4 py-12 text-center">
        <Users aria-hidden="true" className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No scores yet this week.
        </p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      {entries.map((entry) => {
        const mine = entry.mine;

        return (
          <li
            key={entry.handle}
            aria-current={mine ? "true" : undefined}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 sm:px-5",
              mine && "bg-interactive-surface/60",
            )}
          >
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums",
                entry.position <= PODIUM
                  ? "border border-warning-border bg-warning-surface text-warning-foreground"
                  : "text-muted-foreground",
              )}
            >
              {entry.position}
            </span>
            <Link
              to="/u/$handle"
              params={{ handle: entry.handle }}
              className="group flex min-w-0 flex-1 items-center gap-2.5"
            >
              <UserAvatar
                name={entry.displayName}
                url={entry.avatarUrl}
                size="sm"
              />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-medium group-hover:underline">
                  {entry.displayName}
                  {mine ? " (you)" : ""}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  @{entry.handle}
                </span>
              </span>
            </Link>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {entry.score}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
