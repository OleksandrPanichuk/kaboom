import { t } from "elysia";

import { MAX_COMMENT_LENGTH } from "../problem-comments.constants";

export const CommentBody = t.String({
  minLength: 1,
  maxLength: MAX_COMMENT_LENGTH,
  pattern: "\\S",
});

export const PostProblemCommentInput = t.Object({
  body: CommentBody,
  spoiler: t.Optional(t.Boolean()),
  parentId: t.Optional(
    t.String({
      format: "uuid",
      description:
        "The comment to answer. A reply to a reply joins the same thread.",
    }),
  ),
});
export type PostProblemCommentInput = typeof PostProblemCommentInput.static;
