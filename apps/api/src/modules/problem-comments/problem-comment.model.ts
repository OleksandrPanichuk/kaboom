import { t } from "elysia";

import { COMMENT_REMOVERS } from "@/db";

export const ProblemCommentModel = t.Object({
  id: t.String({ format: "uuid" }),
  parentId: t.Nullable(t.String({ format: "uuid" })),
  body: t.String({ description: "Empty once the comment is removed" }),
  spoiler: t.Boolean({
    description: "The writer says it gives part of a solution away",
  }),
  author: t.Nullable(
    t.Object(
      {
        handle: t.String(),
        displayName: t.String(),
        avatarUrl: t.Nullable(t.String()),
      },
      {
        description:
          "Null when the comment is removed or the writer's profile is hidden",
      },
    ),
  ),
  byProblemAuthor: t.Boolean(),
  mine: t.Boolean(),
  createdAt: t.String({ format: "date-time" }),
  editedAt: t.Nullable(t.String({ format: "date-time" })),
  removed: t.Nullable(t.UnionEnum(COMMENT_REMOVERS)),
});
export type ProblemCommentModel = typeof ProblemCommentModel.static;

export const ProblemCommentThreadModel = t.Object({
  ...ProblemCommentModel.properties,
  replies: t.Array(ProblemCommentModel, {
    description: "Oldest first, without the removed ones",
  }),
});
export type ProblemCommentThreadModel = typeof ProblemCommentThreadModel.static;

export const ProblemCommentMessageModel = t.Object({ message: t.String() });
export type ProblemCommentMessageModel =
  typeof ProblemCommentMessageModel.static;
