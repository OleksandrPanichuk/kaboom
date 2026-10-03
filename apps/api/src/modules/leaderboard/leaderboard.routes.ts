import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { getLeaderboardRoute, saveLeaderboardProfileRoute } from "./routes";
import type {
  GetLeaderboardUseCase,
  SaveLeaderboardProfileUseCase,
} from "./use-cases";

export interface LeaderboardActions {
  getLeaderboard: Executable<GetLeaderboardUseCase>;
  saveLeaderboardProfile: Executable<SaveLeaderboardProfileUseCase>;
}

export const leaderboardRoutes = (actions: LeaderboardActions) =>
  new Elysia({ name: "leaderboard", prefix: "/leaderboard" })
    .get("/", ...getLeaderboardRoute(actions))
    .put("/me", ...saveLeaderboardProfileRoute(actions));
