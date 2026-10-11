import { defineRoute } from "@/core/route";

import { ProblemDraftModel } from "../authoring.model";
import type { AuthoringActions } from "../authoring.routes";
import { DraftEntity } from "../draft.entity";
import { DraftParams } from "./draft-params";

export const withdrawReviewRoute = ({ withdrawReview }: AuthoringActions) =>
  defineRoute({
    params: DraftParams,
    response: ProblemDraftModel,
    summary: "Take back a draft that waits for review",
    auth: true,

    action: ({ params, user }) =>
      withdrawReview.execute({ authorId: user.id, draftId: params.id }),
    postAction: ({ output }) => DraftEntity.normalize(output),
  });
