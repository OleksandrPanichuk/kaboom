import { t } from "elysia";

import { CommentBody } from "./post-problem-comment.dto";

export const EditProblemCommentInput = t.Object(
  {
    body: t.Optional(CommentBody),
    spoiler: t.Optional(t.Boolean()),
  },
  { minProperties: 1 },
);
export type EditProblemCommentInput = typeof EditProblemCommentInput.static;
