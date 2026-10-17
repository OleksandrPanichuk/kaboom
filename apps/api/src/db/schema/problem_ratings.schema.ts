import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  primaryKey,
  smallint,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { problemsSchema } from "./problems.schema";
import { usersSchema } from "./users.schema";

export const problemRatingsSchema = pgTable(
  "problem_ratings",
  {
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problemsSchema.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    stars: smallint("stars").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.problemId, table.userId] }),
    index("problem_ratings_user_id_idx").on(table.userId),
    check("problem_ratings_stars_check", sql`${table.stars} between 1 and 5`),
  ],
);

export type ProblemRatingRow = typeof problemRatingsSchema.$inferSelect;
