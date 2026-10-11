import { index, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { problemsSchema } from "./problems.schema";
import { usersSchema } from "./users.schema";

export const problemDraftsSchema = pgTable(
  "problem_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    problemId: uuid("problem_id")
      .unique()
      .references(() => problemsSchema.id, { onDelete: "set null" }),
    forkedFromId: uuid("forked_from_id").references(() => problemsSchema.id, {
      onDelete: "set null",
    }),
    content: jsonb("content").$type<unknown>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("problem_drafts_author_id_updated_at_idx").on(
      table.authorId,
      table.updatedAt,
    ),
  ],
);

export type ProblemDraftRow = typeof problemDraftsSchema.$inferSelect;
