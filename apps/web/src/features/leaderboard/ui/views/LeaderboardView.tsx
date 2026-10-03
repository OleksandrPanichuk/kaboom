import { useSuspenseQuery } from "@tanstack/react-query";

import { leaderboardQuery } from "@/features/leaderboard/api";
import type { LeaderboardFilter } from "@/features/leaderboard/typedefs";
import {
  MyStanding,
  PeriodFilter,
  StandingsTable,
} from "@/features/leaderboard/ui/components";
import { TrackFilter } from "@/features/problems";

interface LeaderboardViewProps {
  filter: LeaderboardFilter;
  onFilterChange: (filter: LeaderboardFilter) => void;
}

export function LeaderboardView({
  filter,
  onFilterChange,
}: LeaderboardViewProps) {
  const { data } = useSuspenseQuery(leaderboardQuery(filter));

  return (
    <div className="flex-1 bg-zinc-50/70 px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-[-0.04em]">
            Leaderboard
          </h1>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base text-pretty">
            Points from the best counted score on each official problem,
            weighted by difficulty. Only people who chose a handle appear.
          </p>
        </div>
        <MyStanding me={data.me} />
        <div className="flex flex-wrap gap-2">
          <PeriodFilter
            value={filter.period}
            onChange={(period) => onFilterChange({ ...filter, period })}
          />
          <TrackFilter
            value={filter.track}
            onChange={(track) => onFilterChange({ ...filter, track })}
          />
        </div>
        <StandingsTable
          entries={data.entries}
          me={data.me.visible ? data.me.handle : null}
        />
      </div>
    </div>
  );
}
