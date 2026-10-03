import {
  mapPage,
  PageModel,
  PageQuery,
  toPageRequest,
} from "@/core/pagination";
import { defineRoute } from "@/core/route";
import { ProblemParams } from "@/modules/problems";

import { SubmissionEntity } from "../submission.entity";
import { SubmissionModel } from "../submission.model";
import type { SubmissionsActions } from "../submissions.routes";

export const listSubmissionsRoute = ({ listSubmissions }: SubmissionsActions) =>
  defineRoute({
    params: ProblemParams,
    query: PageQuery,
    response: PageModel(SubmissionModel),
    summary: "List the solver's submissions to a problem, newest first",
    auth: true,

    action: ({ params, query, user }) =>
      listSubmissions.execute({
        userId: user.id,
        slug: params.slug,
        page: toPageRequest(query),
      }),
    postAction: ({ output }) => mapPage(output, SubmissionEntity.normalize),
  });
