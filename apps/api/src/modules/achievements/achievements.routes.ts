import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { getMyAchievementsRoute } from "./routes";
import type { GetMyAchievementsUseCase } from "./use-cases";

export interface AchievementsActions {
  getMyAchievements: Executable<GetMyAchievementsUseCase>;
}

export const achievementsRoutes = (actions: AchievementsActions) =>
  new Elysia({ name: "achievements", prefix: "/achievements" }).get(
    "/me",
    ...getMyAchievementsRoute(actions),
  );
