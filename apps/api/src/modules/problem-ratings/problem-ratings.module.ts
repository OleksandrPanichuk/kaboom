import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";

import { ProblemRatingsRepository } from "./problem-ratings.repository";
import { problemRatingsRoutes } from "./problem-ratings.routes";
import { PostgresProblemRatingsRepository } from "./repositories";
import {
  ClearProblemRatingUseCase,
  GetProblemRatingUseCase,
  RateProblemUseCase,
} from "./use-cases";

export const problemRatingsModule = defineModule({
  name: "problem-ratings",

  register: () => {
    bind(
      ProblemRatingsRepository,
      () => new PostgresProblemRatingsRepository(),
    );
  },

  routes: () =>
    problemRatingsRoutes({
      getProblemRating: makeUseCase(GetProblemRatingUseCase),
      rateProblem: makeUseCase(RateProblemUseCase),
      clearProblemRating: makeUseCase(ClearProblemRatingUseCase),
    }),
});
