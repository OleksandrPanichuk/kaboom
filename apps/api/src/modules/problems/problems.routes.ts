import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import { getProblemRoute, listProblemsRoute } from "./routes";
import type { GetProblemUseCase, ListProblemsUseCase } from "./use-cases";

export interface ProblemsActions {
  listProblems: Executable<ListProblemsUseCase>;
  getProblem: Executable<GetProblemUseCase>;
}

export const problemsRoutes = (actions: ProblemsActions) =>
  new Elysia({ name: "problems", prefix: "/problems" })
    .get("/", ...listProblemsRoute(actions))
    .get("/:slug", ...getProblemRoute(actions));
