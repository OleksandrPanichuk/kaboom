import { defineRoute } from "@/core/route";
import { requireRole } from "@/modules/users";

import { ProblemReviewSummaryModel } from "../authoring.model";
import type { AuthoringActions } from "../authoring.routes";
import { ReviewEntity } from "../draft.entity";
import { RejectReviewInput } from "../dto";
import { ReviewParams } from "./review-params";

export const rejectReviewRoute = ({ rejectReview }: AuthoringActions) =>
  defineRoute({
    params: ReviewParams,
    body: RejectReviewInput,
    response: ProblemReviewSummaryModel,
    summary: "Send a community problem back with what to change",
    description:
      "Moderators only, never on their own problem. The author reads the feedback on the draft and may send it again.",
    auth: true,
    guards: [requireRole("moderator")],

    action: ({ params, body, user }) =>
      rejectReview.execute({
        reviewerId: user.id,
        reviewId: params.id,
        feedback: body.feedback,
      }),
    postAction: ({ output }) => ReviewEntity.summary(output),
  });
