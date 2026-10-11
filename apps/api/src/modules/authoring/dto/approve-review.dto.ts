import { t } from "elysia";

import { PROBLEM_DIFFICULTIES } from "@/db";

export const ApproveReviewInput = t.Object({
  difficulty: t.Optional(
    t.UnionEnum(PROBLEM_DIFFICULTIES, {
      description:
        "Publish at this difficulty instead of the author's, since it sets the points",
    }),
  ),
});
export type ApproveReviewInput = typeof ApproveReviewInput.static;
