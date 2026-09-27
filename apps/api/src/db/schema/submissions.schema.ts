import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { designsSchema } from "./designs.schema";
import { problemAttemptsSchema } from "./problem_attempts.schema";
import { problemsSchema } from "./problems.schema";
import { usersSchema } from "./users.schema";

export const submissionsSchema = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => problemAttemptsSchema.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problemsSchema.id, { onDelete: "cascade" }),
    problemVersion: integer("problem_version").notNull(),
    designId: uuid("design_id")
      .notNull()
      .references(() => designsSchema.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    graphHash: text("graph_hash").notNull(),
    score: integer("score").notNull(),
    items: jsonb("items").$type<unknown[]>().notNull(),
    drills: jsonb("drills").$type<unknown[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("submissions_user_id_problem_id_created_at_idx").on(
      table.userId,
      table.problemId,
      table.createdAt,
      table.id,
    ),
  ],
);

export type SubmissionRow = typeof submissionsSchema.$inferSelect;
