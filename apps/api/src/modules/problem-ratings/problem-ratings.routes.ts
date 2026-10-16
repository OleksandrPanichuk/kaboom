import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  clearProblemRatingRoute,
  getProblemRatingRoute,
  rateProblemRoute,
} from "./routes";
import type {
  ClearProblemRatingUseCase,
  GetProblemRatingUseCase,
  RateProblemUseCase,
} from "./use-cases";

export interface ProblemRatingsActions {
  getProblemRating: Executable<GetProblemRatingUseCase>;
  rateProblem: Executable<RateProblemUseCase>;
  clearProblemRating: Executable<ClearProblemRatingUseCase>;
}

export const problemRatingsRoutes = (actions: ProblemRatingsActions) =>
  new Elysia({ name: "problem-ratings", prefix: "/problems" })
    .get("/:slug/rating", ...getProblemRatingRoute(actions))
    .put("/:slug/rating", ...rateProblemRoute(actions))
    .delete("/:slug/rating", ...clearProblemRatingRoute(actions));
