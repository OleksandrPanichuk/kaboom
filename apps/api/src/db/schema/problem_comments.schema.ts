import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { timeOrderedId } from "../time-ordered-id";
import { problemsSchema } from "./problems.schema";
import { usersSchema } from "./users.schema";

export const COMMENT_REMOVERS = ["author", "moderator"] as const;
export type CommentRemover = (typeof COMMENT_REMOVERS)[number];

export const problemCommentsSchema = pgTable(
  "problem_comments",
  {
    id: timeOrderedId(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problemsSchema.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => problemCommentsSchema.id,
      { onDelete: "cascade" },
    ),
    body: text("body").notNull(),
    spoiler: boolean("spoiler").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    removedBy: text("removed_by", { enum: COMMENT_REMOVERS }),
  },
  (table) => [
    index("problem_comments_threads_idx")
      .on(table.problemId, table.createdAt, table.id)
      .where(sql`${table.parentId} is null`),
    index("problem_comments_parent_id_idx").on(table.parentId, table.createdAt),
    index("problem_comments_author_id_idx").on(table.authorId),
  ],
);

export type ProblemCommentRow = typeof problemCommentsSchema.$inferSelect;
