import { mapPage, PageModel, toPageRequest } from "@/core/pagination";
import { defineRoute } from "@/core/route";
import { requireRole } from "@/modules/users";

import { ProblemReviewSummaryModel } from "../authoring.model";
import type { AuthoringActions } from "../authoring.routes";
import { ReviewEntity } from "../draft.entity";
import { ListReviewsQuery } from "../dto";

export const listReviewsRoute = ({ listReviews }: AuthoringActions) =>
  defineRoute({
    query: ListReviewsQuery,
    response: PageModel(ProblemReviewSummaryModel),
    summary: "List community problems by review status, oldest first",
    description: "Moderators only; pending by default.",
    auth: true,
    guards: [requireRole("moderator")],

    action: ({ query }) =>
      listReviews.execute({
        status: query.status ?? "pending",
        page: toPageRequest(query),
      }),
    postAction: ({ output }) => mapPage(output, ReviewEntity.summary),
  });
