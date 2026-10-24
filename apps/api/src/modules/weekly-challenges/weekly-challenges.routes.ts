import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { getWeeklyChallengeRoute } from "./routes";
import type { GetWeeklyChallengeUseCase } from "./use-cases";

export interface WeeklyChallengesActions {
  getWeeklyChallenge: Executable<GetWeeklyChallengeUseCase>;
}

export const weeklyChallengesRoutes = (actions: WeeklyChallengesActions) =>
  new Elysia({ name: "weekly-challenges", prefix: "/challenges" }).get(
    "/weekly",
    ...getWeeklyChallengeRoute(actions),
  );
