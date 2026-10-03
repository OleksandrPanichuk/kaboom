import { defineRoute } from "@/core/route";
import { InterviewParams } from "@/modules/interviews";

import { ReviewEntity } from "../review.entity";
import { ReviewModel } from "../review.model";
import type { ReviewsActions } from "../reviews.routes";

export const getReviewRoute = ({ getReview }: ReviewsActions) =>
  defineRoute({
    params: InterviewParams,
    response: ReviewModel,
    summary: "Get the review of an interview",
    description:
      "Answers 404 REVIEW_NOT_FOUND until the review is written. The interview's status says whether it is still being written (reviewing) or failed (review_failed).",
    auth: true,

    action: ({ params, user }) =>
      getReview.execute({ ownerId: user.id, interviewId: params.id }),
    postAction: ({ output }) => ReviewEntity.normalize(output),
  });
