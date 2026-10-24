import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";

import { WeeklyChallengesRepository } from "./ports";
import { PostgresWeeklyChallengesRepository } from "./repositories";
import { GetWeeklyChallengeUseCase } from "./use-cases";
import { weeklyChallengesRoutes } from "./weekly-challenges.routes";

export const weeklyChallengesModule = defineModule({
  name: "weekly-challenges",

  register: () => {
    bind(
      WeeklyChallengesRepository,
      () => new PostgresWeeklyChallengesRepository(),
    );
  },

  routes: () =>
    weeklyChallengesRoutes({
      getWeeklyChallenge: makeUseCase(GetWeeklyChallengeUseCase),
    }),
});
