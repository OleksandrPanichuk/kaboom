import { defineRoute } from "@/core/route";
import { ProblemParams } from "@/modules/problems";

import { PostProblemCommentInput } from "../dto";
import { ProblemCommentEntity } from "../problem-comment.entity";
import { ProblemCommentModel } from "../problem-comment.model";
import { POST_COMMENT_RATE_LIMIT } from "../problem-comments.constants";
import type { ProblemCommentsActions } from "../problem-comments.routes";

export const postProblemCommentRoute = ({
  postProblemComment,
}: ProblemCommentsActions) =>
  defineRoute({
    params: ProblemParams,
    body: PostProblemCommentInput,
    response: ProblemCommentModel,
    summary: "Comment on a published problem, or answer a comment",
    description:
      "Needs a verified email. Answers 409 COMMENT_REMOVED when the conversation was removed, and 409 COMMENT_THREAD_FULL past 50 replies.",
    auth: true,
    verifiedEmail: true,
    rateLimit: POST_COMMENT_RATE_LIMIT,

    action: ({ params, body, user }) =>
      postProblemComment.execute({
        authorId: user.id,
        slug: params.slug,
        body: body.body,
        spoiler: body.spoiler ?? false,
        parentId: body.parentId ?? null,
      }),
    postAction: ({ output, user }) =>
      ProblemCommentEntity.normalize(output.comment, {
        userId: user.id,
        problemAuthorId: output.problemAuthorId,
      }),
  });
