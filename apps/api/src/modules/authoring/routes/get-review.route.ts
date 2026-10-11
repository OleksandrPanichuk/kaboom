import { defineRoute } from "@/core/route";

import { ProblemReviewModel } from "../authoring.model";
import type { AuthoringActions } from "../authoring.routes";
import { ReviewEntity } from "../draft.entity";
import { ReviewParams } from "./review-params";

export const getReviewRoute = ({ getReview }: AuthoringActions) =>
  defineRoute({
    params: ReviewParams,
    response: ProblemReviewModel,
    summary: "Get a review with the content it is about",
    description:
      "For a moderator or the author. An update carries the published version it would replace in currentContent.",
    auth: true,

    action: ({ params, user }) =>
      getReview.execute({ viewerId: user.id, reviewId: params.id }),
    postAction: ({ output }) => ReviewEntity.normalize(output),
  });
