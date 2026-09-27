import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  getAttemptRoute,
  getProgressRoute,
  listSubmissionsRoute,
  revealHintRoute,
  runProblemRoute,
  startProblemRoute,
  submitSolutionRoute,
} from "./routes";
import type {
  GetAttemptUseCase,
  GetProgressUseCase,
  ListSubmissionsUseCase,
  RevealHintUseCase,
  RunProblemUseCase,
  StartProblemUseCase,
  SubmitSolutionUseCase,
} from "./use-cases";

export interface SubmissionsActions {
  startProblem: Executable<StartProblemUseCase>;
  getAttempt: Executable<GetAttemptUseCase>;
  runProblem: Executable<RunProblemUseCase>;
  submitSolution: Executable<SubmitSolutionUseCase>;
  listSubmissions: Executable<ListSubmissionsUseCase>;
  getProgress: Executable<GetProgressUseCase>;
  revealHint: Executable<RevealHintUseCase>;
}

export const submissionsRoutes = (actions: SubmissionsActions) =>
  new Elysia({ name: "submissions" })
    .post("/problems/:slug/start", ...startProblemRoute(actions))
    .get("/problems/:slug/attempt", ...getAttemptRoute(actions))
    .post("/problems/:slug/runs", ...runProblemRoute(actions))
    .post("/problems/:slug/hints/:index", ...revealHintRoute(actions))
    .post("/problems/:slug/submissions", ...submitSolutionRoute(actions))
    .get("/problems/:slug/submissions", ...listSubmissionsRoute(actions))
    .get("/progress", ...getProgressRoute(actions));
