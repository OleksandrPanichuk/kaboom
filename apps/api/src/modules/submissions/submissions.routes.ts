import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  getAttemptRoute,
  getProgressRoute,
  listSubmissionsRoute,
  revealHintRoute,
  revealSolutionsRoute,
  runProblemRoute,
  startProblemRoute,
  submitSolutionRoute,
  upgradeAttemptRoute,
} from "./routes";
import type {
  GetAttemptUseCase,
  GetProgressUseCase,
  ListSubmissionsUseCase,
  RevealHintUseCase,
  RevealSolutionsUseCase,
  RunProblemUseCase,
  StartProblemUseCase,
  SubmitSolutionUseCase,
  UpgradeAttemptUseCase,
} from "./use-cases";

export interface SubmissionsActions {
  startProblem: Executable<StartProblemUseCase>;
  getAttempt: Executable<GetAttemptUseCase>;
  upgradeAttempt: Executable<UpgradeAttemptUseCase>;
  runProblem: Executable<RunProblemUseCase>;
  submitSolution: Executable<SubmitSolutionUseCase>;
  listSubmissions: Executable<ListSubmissionsUseCase>;
  getProgress: Executable<GetProgressUseCase>;
  revealHint: Executable<RevealHintUseCase>;
  revealSolutions: Executable<RevealSolutionsUseCase>;
}

export const submissionsRoutes = (actions: SubmissionsActions) =>
  new Elysia({ name: "submissions" })
    .post("/problems/:slug/start", ...startProblemRoute(actions))
    .get("/problems/:slug/attempt", ...getAttemptRoute(actions))
    .post("/problems/:slug/attempt/upgrade", ...upgradeAttemptRoute(actions))
    .post("/problems/:slug/runs", ...runProblemRoute(actions))
    .post("/problems/:slug/hints/:index", ...revealHintRoute(actions))
    .post("/problems/:slug/solutions/reveal", ...revealSolutionsRoute(actions))
    .post("/problems/:slug/submissions", ...submitSolutionRoute(actions))
    .get("/problems/:slug/submissions", ...listSubmissionsRoute(actions))
    .get("/progress", ...getProgressRoute(actions));
