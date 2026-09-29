import { t } from "elysia";

import { defineRoute } from "@/core/route";
import { InterviewParams, InterviewStatusModel } from "@/modules/interviews";

import { ReviewEntity } from "../review.entity";
import { ReviewModel } from "../review.model";
import { RETRY_REVIEW_RATE_LIMIT } from "../reviews.constants";
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

export const retryReviewRoute = ({ retryReview }: ReviewsActions) =>
  defineRoute({
    params: InterviewParams,
    body: t.Optional(t.Object({})),
    response: InterviewStatusModel,
    summary: "Write a failed review again",
    description:
      "Moves an interview whose review failed back to reviewing and schedules the review. Any other status answers 409 REVIEW_NOT_FAILED.",
    auth: true,
    rateLimit: RETRY_REVIEW_RATE_LIMIT,

    action: ({ params, user, set }) => {
      set.status = 202;

      return retryReview.execute({ ownerId: user.id, interviewId: params.id });
    },
    postAction: ({ output }) => ({ status: output.status }),
  });
