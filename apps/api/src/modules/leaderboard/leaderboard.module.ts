import { defineModule } from "@/core/module";
import { bind, makeService, makeUseCase } from "@/core/registry";
import { ScoreBoard } from "@/modules/submissions";

import { leaderboardRoutes } from "./leaderboard.routes";
import { LeaderboardScoreBoard } from "./leaderboard.score-board";
import { LeaderboardService } from "./leaderboard.service";
import { LeaderboardRepository } from "./ports";
import { PostgresLeaderboardRepository } from "./repositories";
import { GetLeaderboardUseCase } from "./use-cases";

export const leaderboardModule = defineModule({
  name: "leaderboard",

  register: () => {
    bind(LeaderboardRepository, () => new PostgresLeaderboardRepository());
    bind(ScoreBoard, () => new LeaderboardScoreBoard());

    return {};
  },

  start: async () => {
    await makeService(LeaderboardService).rebuildIfStale();
  },

  routes: () =>
    leaderboardRoutes({
      getLeaderboard: makeUseCase(GetLeaderboardUseCase),
    }),
});
