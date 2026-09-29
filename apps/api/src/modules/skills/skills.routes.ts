import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { getMySkillsRoute } from "./routes";
import type { GetMySkillsUseCase } from "./use-cases";

export interface SkillsActions {
  getMySkills: Executable<GetMySkillsUseCase>;
}

export const skillsRoutes = (actions: SkillsActions) =>
  new Elysia({ name: "skills", prefix: "/skills" }).get(
    "/me",
    ...getMySkillsRoute(actions),
  );
