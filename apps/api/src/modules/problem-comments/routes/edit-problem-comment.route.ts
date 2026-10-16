import { defineRoute } from "@/core/route";

import { EditProblemCommentInput } from "../dto";
import { ProblemCommentEntity } from "../problem-comment.entity";
import { ProblemCommentModel } from "../problem-comment.model";
import { EDIT_COMMENT_RATE_LIMIT } from "../problem-comments.constants";
import type { ProblemCommentsActions } from "../problem-comments.routes";
import { CommentParams } from "./comment-params";

export const editProblemCommentRoute = ({
  editProblemComment,
}: ProblemCommentsActions) =>
  defineRoute({
    params: CommentParams,
    body: EditProblemCommentInput,
    response: ProblemCommentModel,
    summary: "Edit your own comment",
    description:
      "Only its writer may, and only while it stands. The comment is marked as edited.",
    auth: true,
    rateLimit: EDIT_COMMENT_RATE_LIMIT,

    action: ({ params, body, user }) =>
      editProblemComment.execute({
        userId: user.id,
        slug: params.slug,
        commentId: params.id,
        body: body.body,
        spoiler: body.spoiler,
      }),
    postAction: ({ output, user }) =>
      ProblemCommentEntity.normalize(output.comment, {
        userId: user.id,
        problemAuthorId: output.problemAuthorId,
      }),
  });
