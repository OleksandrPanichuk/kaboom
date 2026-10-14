import type { LeaderboardModel } from "@repo/api-client";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Users } from "lucide-react";

import { UserAvatar } from "@/features/profile";

interface StandingsTableProps {
  entries: LeaderboardModel["entries"];
  me: string | null;
}

const PODIUM = 3;

export function StandingsTable({ entries, me }: StandingsTableProps) {
  const ranked = entries.some((entry) => entry.rank !== null);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 px-4 py-12 text-center">
        <Users aria-hidden="true" className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nobody is on this board yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="w-14 py-2.5 pr-2 pl-4 font-medium sm:pl-5">#</th>
            <th className="w-full px-3 py-2.5 font-medium">Name</th>
            {ranked ? (
              <th className="hidden px-3 py-2.5 font-medium sm:table-cell">
                Rank
              </th>
            ) : null}
            <th className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">
              Solved
            </th>
            <th className="py-2.5 pr-4 pl-3 text-right font-medium sm:pr-5">
              Points
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border tabular-nums">
          {entries.map((entry) => {
            const mine = entry.handle === me;
            const podium = entry.position <= PODIUM;

            return (
              <tr
                key={entry.handle}
                aria-current={mine ? "true" : undefined}
                className={cn(
                  "transition-colors hover:bg-muted/40",
                  mine &&
                    "bg-interactive-surface/60 hover:bg-interactive-surface/80",
                )}
              >
                <td className="py-2.5 pr-2 pl-4 sm:pl-5">
                  <span
                    className={cn(
                      "grid size-7 place-items-center rounded-full text-xs font-semibold",
                      podium
                        ? "border border-warning-border bg-warning-surface text-warning-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {entry.position}
                  </span>
                </td>
                <td className="max-w-0 px-3 py-2.5">
                  <Link
                    to="/u/$handle"
                    params={{ handle: entry.handle }}
                    className="group flex min-w-0 items-center gap-2.5"
                  >
                    <UserAvatar
                      name={entry.displayName}
                      url={entry.avatarUrl}
                      size="sm"
                    />
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium group-hover:underline">
                          {entry.displayName}
                        </span>
                        {mine ? (
                          <span className="shrink-0 rounded-md bg-interactive-surface px-1.5 py-0.5 text-[11px] font-medium text-interactive-foreground">
                            You
                          </span>
                        ) : null}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        @{entry.handle}
                      </span>
                    </span>
                  </Link>
                </td>
                {ranked ? (
                  <td className="hidden px-3 py-2.5 text-muted-foreground sm:table-cell">
                    {entry.rank}
                  </td>
                ) : null}
                <td className="hidden px-3 py-2.5 text-right text-muted-foreground sm:table-cell">
                  {entry.solved}
                </td>
                <td className="py-2.5 pr-4 pl-3 text-right font-semibold sm:pr-5">
                  {entry.points.toLocaleString("en")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
