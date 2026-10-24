import { defineModule } from "@/core/module";
import { makeUseCase } from "@/core/registry";

import { achievementsRoutes } from "./achievements.routes";
import { GetMyAchievementsUseCase } from "./use-cases";

export const achievementsModule = defineModule({
  name: "achievements",

  routes: () =>
    achievementsRoutes({
      getMyAchievements: makeUseCase(GetMyAchievementsUseCase),
    }),
});
