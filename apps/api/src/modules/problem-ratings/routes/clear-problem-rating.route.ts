import { defineRoute } from "@/core/route";
import { ProblemParams } from "@/modules/problems";

import { ProblemRatingEntity } from "../problem-rating.entity";
import { ProblemRatingModel } from "../problem-rating.model";
import { RATE_PROBLEM_RATE_LIMIT } from "../problem-ratings.constants";
import type { ProblemRatingsActions } from "../problem-ratings.routes";

export const clearProblemRatingRoute = ({
  clearProblemRating,
}: ProblemRatingsActions) =>
  defineRoute({
    params: ProblemParams,
    response: ProblemRatingModel,
    summary: "Take back the caller's rating of a problem",
    auth: true,
    rateLimit: RATE_PROBLEM_RATE_LIMIT,

    action: ({ params, user }) =>
      clearProblemRating.execute({ userId: user.id, slug: params.slug }),
    postAction: ({ output }) => ProblemRatingEntity.normalize(output),
  });
