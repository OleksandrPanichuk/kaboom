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
    <div className="flex-1 bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex max-w-3xl flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">
            Leaderboard
          </h1>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base text-pretty">
            Points from the best counted score on each published problem,
            weighted by difficulty. Everyone with a public profile appears.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&>*]:shrink-0 [&>*]:flex-nowrap">
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
          <aside className="order-first flex flex-col gap-6 lg:sticky lg:top-6 lg:order-none">
            <MyStanding me={data.me} />
          </aside>
        </div>
      </div>
    </div>
  );
}
