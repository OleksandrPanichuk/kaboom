import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";

import { leaderboardRoutes } from "./leaderboard.routes";
import { LeaderboardRepository } from "./ports";
import { PostgresLeaderboardRepository } from "./repositories";
import {
  GetLeaderboardUseCase,
  SaveLeaderboardProfileUseCase,
} from "./use-cases";

export const leaderboardModule = defineModule({
  name: "leaderboard",

  register: () => {
    bind(LeaderboardRepository, () => new PostgresLeaderboardRepository());

    return {};
  },

  routes: () =>
    leaderboardRoutes({
      getLeaderboard: makeUseCase(GetLeaderboardUseCase),
      saveLeaderboardProfile: makeUseCase(SaveLeaderboardProfileUseCase),
    }),
});
