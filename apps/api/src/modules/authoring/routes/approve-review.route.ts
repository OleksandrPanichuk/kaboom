import { defineRoute } from "@/core/route";
import { requireRole } from "@/modules/users";

import { ProblemReviewSummaryModel } from "../authoring.model";
import type { AuthoringActions } from "../authoring.routes";
import { ReviewEntity } from "../draft.entity";
import { ApproveReviewInput } from "../dto";
import { ReviewParams } from "./review-params";

export const approveReviewRoute = ({ approveReview }: AuthoringActions) =>
  defineRoute({
    params: ReviewParams,
    body: ApproveReviewInput,
    response: ProblemReviewSummaryModel,
    summary: "Approve a community problem and publish it",
    description:
      "Moderators only, never on their own problem (403 OWN_PROBLEM_REVIEW). Runs the publish check again, then publishes a new problem or a new version of one; attempts already started stay on their version.",
    auth: true,
    guards: [requireRole("moderator")],

    action: ({ params, body, user }) =>
      approveReview.execute({
        reviewerId: user.id,
        reviewId: params.id,
        difficulty: body.difficulty ?? null,
      }),
    postAction: ({ output }) => ReviewEntity.summary(output),
  });
