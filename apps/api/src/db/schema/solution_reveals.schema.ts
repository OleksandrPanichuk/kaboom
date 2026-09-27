import { pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { problemsSchema } from "./problems.schema";
import { usersSchema } from "./users.schema";

export const solutionRevealsSchema = pgTable(
  "solution_reveals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problemsSchema.id, { onDelete: "cascade" }),
    revealedAt: timestamp("revealed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("solution_reveals_user_id_problem_id_idx").on(
      table.userId,
      table.problemId,
    ),
  ],
);

export type SolutionRevealRow = typeof solutionRevealsSchema.$inferSelect;
