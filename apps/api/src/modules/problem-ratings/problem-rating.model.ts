import { t } from "elysia";

import { MAX_STARS } from "./problem-ratings.constants";

export const ProblemRatingModel = t.Object({
  average: t.Nullable(
    t.Number({ description: "Stars out of five, to one decimal" }),
  ),
  count: t.Integer(),
  distribution: t.Array(t.Integer(), {
    minItems: MAX_STARS,
    maxItems: MAX_STARS,
    description: "How many gave one star, two stars and so on, in that order",
  }),
  mine: t.Nullable(t.Integer({ minimum: 1, maximum: MAX_STARS })),
  eligibility: t.UnionEnum(["eligible", "own-problem", "needs-submission"], {
    description:
      "Whether the caller may rate: a problem's author never may, and anyone else once they have submitted to it",
  }),
});
export type ProblemRatingModel = typeof ProblemRatingModel.static;
