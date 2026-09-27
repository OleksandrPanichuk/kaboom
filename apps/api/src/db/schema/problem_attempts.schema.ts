import {
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { designsSchema } from "./designs.schema";
import { problemsSchema } from "./problems.schema";
import { usersSchema } from "./users.schema";

export const problemAttemptsSchema = pgTable(
  "problem_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problemsSchema.id, { onDelete: "cascade" }),
    problemVersion: integer("problem_version").notNull(),
    designId: uuid("design_id")
      .notNull()
      .unique()
      .references(() => designsSchema.id, { onDelete: "cascade" }),
    hintsRevealed: integer("hints_revealed").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("problem_attempts_user_id_problem_id_idx").on(
      table.userId,
      table.problemId,
    ),
  ],
);

export type ProblemAttemptRow = typeof problemAttemptsSchema.$inferSelect;
