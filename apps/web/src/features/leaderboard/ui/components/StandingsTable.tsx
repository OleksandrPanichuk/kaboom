import type { LeaderboardModel } from "@repo/api-client";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";

import { UserAvatar } from "@/features/profile";

interface StandingsTableProps {
  entries: LeaderboardModel["entries"];
  me: string | null;
}

export function StandingsTable({ entries, me }: StandingsTableProps) {
  const ranked = entries.some((entry) => entry.rank !== null);

  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        Nobody is on this board yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="w-14 px-4 py-2.5 font-medium">#</th>
            <th className="w-full px-4 py-2.5 font-medium">Name</th>
            {ranked ? (
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                Rank
              </th>
            ) : null}
            <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">
              Solved
            </th>
            <th className="px-4 py-2.5 text-right font-medium">Points</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {entries.map((entry) => {
            const mine = entry.handle === me;

            return (
              <tr
                key={entry.handle}
                aria-current={mine ? "true" : undefined}
                className={cn("border-t", mine && "bg-interactive-surface/70")}
              >
                <td className="px-4 py-2.5 font-semibold text-muted-foreground">
                  {entry.position}
                </td>
                <td className="max-w-0 px-4 py-2">
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
                      <span className="truncate font-medium group-hover:underline">
                        {entry.displayName}
                        {mine ? (
                          <span className="ml-2 text-xs font-normal text-interactive-foreground">
                            you
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
                  <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">
                    {entry.rank}
                  </td>
                ) : null}
                <td className="hidden px-4 py-2.5 text-right sm:table-cell">
                  {entry.solved}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold">
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
