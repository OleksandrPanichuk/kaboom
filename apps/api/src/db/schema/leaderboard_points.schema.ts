import {
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { problemsSchema } from "./problems.schema";
import { usersSchema } from "./users.schema";

export const leaderboardPointsSchema = pgTable(
  "leaderboard_points",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problemsSchema.id, { onDelete: "cascade" }),
    bestScore: integer("best_score").notNull(),
    achievedAt: timestamp("achieved_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.problemId] }),
    index("leaderboard_points_problem_id_idx").on(table.problemId),
  ],
);

export type LeaderboardPointsRow = typeof leaderboardPointsSchema.$inferSelect;
