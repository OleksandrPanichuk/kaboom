import { pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";

import { problemsSchema } from "./problems.schema";
import { usersSchema } from "./users.schema";

export const commentDigestsSchema = pgTable(
  "comment_digests",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problemsSchema.id, { onDelete: "cascade" }),
    sentUpTo: timestamp("sent_up_to", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.problemId] })],
);

export type CommentDigestRow = typeof commentDigestsSchema.$inferSelect;
