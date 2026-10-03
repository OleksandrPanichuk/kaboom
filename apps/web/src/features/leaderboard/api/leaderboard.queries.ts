import { queryOptions } from "@tanstack/react-query";

import type { LeaderboardFilter } from "@/features/leaderboard/typedefs";
import { api, unwrap } from "@/lib/api";

export const leaderboardQuery = ({ period, track }: LeaderboardFilter) =>
  queryOptions({
    queryKey: ["leaderboard", period, track],
    queryFn: async () =>
      unwrap(
        await api.api.leaderboard.get({
          query: { period, ...(track ? { track } : {}) },
        }),
      ),
  });
