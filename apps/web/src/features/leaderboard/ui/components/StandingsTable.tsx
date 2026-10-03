import type { LeaderboardModel } from "@repo/api-client";
import { cn } from "cn";

interface StandingsTableProps {
  entries: LeaderboardModel["entries"];
  me: string | null;
}

export function StandingsTable({ entries, me }: StandingsTableProps) {
  const ranked = entries.some((entry) => entry.rank !== null);

  if (entries.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-black/10 px-4 py-10 text-center text-sm text-muted-foreground">
        Nobody is on this board yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-black/[0.07] bg-white">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="w-14 px-4 py-2.5 font-medium">#</th>
            <th className="px-4 py-2.5 font-medium">Handle</th>
            {ranked ? (
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                Rank
              </th>
            ) : null}
            <th className="px-4 py-2.5 text-right font-medium">Solved</th>
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
                className={cn("border-t", mine && "bg-indigo-50/70")}
              >
                <td className="px-4 py-2.5 font-semibold text-muted-foreground">
                  {entry.position}
                </td>
                <td className="max-w-0 truncate px-4 py-2.5 font-medium">
                  {entry.handle}
                  {mine ? (
                    <span className="ml-2 text-xs font-normal text-indigo-700">
                      you
                    </span>
                  ) : null}
                </td>
                {ranked ? (
                  <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">
                    {entry.rank}
                  </td>
                ) : null}
                <td className="px-4 py-2.5 text-right">{entry.solved}</td>
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
