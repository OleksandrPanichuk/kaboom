import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { getMySkillHistoryRoute, getMySkillsRoute } from "./routes";
import type { GetMySkillHistoryUseCase, GetMySkillsUseCase } from "./use-cases";

export interface SkillsActions {
  getMySkills: Executable<GetMySkillsUseCase>;
  getMySkillHistory: Executable<GetMySkillHistoryUseCase>;
}

export const skillsRoutes = (actions: SkillsActions) =>
  new Elysia({ name: "skills", prefix: "/skills" })
    .get("/me", ...getMySkillsRoute(actions))
    .get("/me/history", ...getMySkillHistoryRoute(actions));
