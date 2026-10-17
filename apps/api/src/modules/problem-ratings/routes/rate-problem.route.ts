import { defineRoute } from "@/core/route";
import { ProblemParams } from "@/modules/problems";

import { RateProblemInput } from "../dto";
import { ProblemRatingEntity } from "../problem-rating.entity";
import { ProblemRatingModel } from "../problem-rating.model";
import { RATE_PROBLEM_RATE_LIMIT } from "../problem-ratings.constants";
import type { ProblemRatingsActions } from "../problem-ratings.routes";

export const rateProblemRoute = ({ rateProblem }: ProblemRatingsActions) =>
  defineRoute({
    params: ProblemParams,
    body: RateProblemInput,
    response: ProblemRatingModel,
    summary: "Rate a published problem from one to five stars",
    description:
      "Rating again replaces the caller's stars. Answers 403 RATING_NEEDS_SUBMISSION before the caller has submitted a solution to it, and 403 RATING_OWN_PROBLEM for its author.",
    auth: true,
    rateLimit: RATE_PROBLEM_RATE_LIMIT,

    action: ({ params, body, user }) =>
      rateProblem.execute({
        userId: user.id,
        slug: params.slug,
        stars: body.stars,
      }),
    postAction: ({ output }) => ProblemRatingEntity.normalize(output),
  });
