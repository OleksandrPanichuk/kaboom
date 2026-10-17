import { defineRoute } from "@/core/route";
import { ProblemParams } from "@/modules/problems";

import { ProblemRatingEntity } from "../problem-rating.entity";
import { ProblemRatingModel } from "../problem-rating.model";
import type { ProblemRatingsActions } from "../problem-ratings.routes";

export const getProblemRatingRoute = ({
  getProblemRating,
}: ProblemRatingsActions) =>
  defineRoute({
    params: ProblemParams,
    response: ProblemRatingModel,
    summary: "Get a published problem's rating, with the caller's own",
    auth: true,

    action: ({ params, user }) =>
      getProblemRating.execute({ userId: user.id, slug: params.slug }),
    postAction: ({ output }) => ProblemRatingEntity.normalize(output),
  });
