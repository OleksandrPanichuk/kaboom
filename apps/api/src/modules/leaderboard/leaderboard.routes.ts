import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { getLeaderboardRoute } from "./routes";
import type { GetLeaderboardUseCase } from "./use-cases";

export interface LeaderboardActions {
  getLeaderboard: Executable<GetLeaderboardUseCase>;
}

export const leaderboardRoutes = (actions: LeaderboardActions) =>
  new Elysia({ name: "leaderboard", prefix: "/leaderboard" }).get(
    "/",
    ...getLeaderboardRoute(actions),
  );
