import {
  mapPage,
  PageModel,
  PageQuery,
  toPageRequest,
} from "@/core/pagination";
import { defineRoute } from "@/core/route";

import { InterviewEntity } from "../interview.entity";
import { InterviewSummaryModel } from "../interview.model";
import type { InterviewsActions } from "../interviews.routes";

export const listInterviewsRoute = ({ listInterviews }: InterviewsActions) =>
  defineRoute({
    query: PageQuery,
    response: PageModel(InterviewSummaryModel),
    summary: "List the user's interviews, newest first",
    auth: true,

    action: ({ query, user }) =>
      listInterviews.execute({ ownerId: user.id, page: toPageRequest(query) }),
    postAction: ({ output }) =>
      mapPage(output, InterviewEntity.normalizeSummary),
  });
