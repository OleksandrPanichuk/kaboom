import {
  mapPage,
  PageModel,
  PageQuery,
  toPageRequest,
} from "@/core/pagination";
import { defineRoute } from "@/core/route";
import { ProblemParams } from "@/modules/problems";

import { ProblemCommentEntity } from "../problem-comment.entity";
import { ProblemCommentThreadModel } from "../problem-comment.model";
import type { ProblemCommentsActions } from "../problem-comments.routes";

export const listProblemCommentsRoute = ({
  listProblemComments,
}: ProblemCommentsActions) =>
  defineRoute({
    params: ProblemParams,
    query: PageQuery,
    response: PageModel(ProblemCommentThreadModel),
    summary: "List a published problem's comments, newest conversation first",
    description:
      "Each conversation carries its replies, oldest first. A removed comment stays, empty, only while it has replies.",
    auth: true,

    action: ({ params, query }) =>
      listProblemComments.execute({
        slug: params.slug,
        page: toPageRequest(query),
      }),
    postAction: ({ output, user }) =>
      mapPage(output.threads, (thread) =>
        ProblemCommentEntity.normalizeThread(thread, {
          userId: user.id,
          problemAuthorId: output.problemAuthorId,
        }),
      ),
  });
