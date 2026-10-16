import { defineRoute } from "@/core/route";

import { ProblemCommentMessageModel } from "../problem-comment.model";
import type { ProblemCommentsActions } from "../problem-comments.routes";
import { CommentParams } from "./comment-params";

export const removeProblemCommentRoute = ({
  removeProblemComment,
}: ProblemCommentsActions) =>
  defineRoute({
    params: CommentParams,
    response: ProblemCommentMessageModel,
    summary: "Remove a comment",
    description:
      "Its writer may remove it, and so may a moderator, which the comment then says. Its replies stay.",
    auth: true,

    action: ({ params, user }) =>
      removeProblemComment.execute({
        userId: user.id,
        slug: params.slug,
        commentId: params.id,
      }),
    postAction: () => ({ message: "ok" }),
  });
