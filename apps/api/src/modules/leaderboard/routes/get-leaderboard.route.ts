import { defineRoute } from "@/core/route";
import { rankFor } from "@/modules/submissions";

import { LeaderboardQuery } from "../dto";
import { LeaderboardEntity } from "../leaderboard.entity";
import { LeaderboardModel } from "../leaderboard.model";
import type { LeaderboardActions } from "../leaderboard.routes";

export const getLeaderboardRoute = ({ getLeaderboard }: LeaderboardActions) =>
  defineRoute({
    query: LeaderboardQuery,
    response: LeaderboardModel,
    summary: "Get the leaderboard, all time or this week, overall or by track",
    description:
      "Ranks the people who chose a handle and to be listed by points: each official problem's best counted score times its difficulty weight. This week counts only submissions of the last seven days. me is the caller's own standing, with a position only when they are listed.",
    auth: true,

    action: ({ query, user }) =>
      getLeaderboard.execute({
        userId: user.id,
        period: query.period ?? "all",
        track: query.track ?? null,
      }),
    postAction: ({ output }) =>
      LeaderboardEntity.normalize(output, (points) => rankFor(points).name),
  });
