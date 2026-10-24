import { date, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { problemsSchema } from "./problems.schema";

export const weeklyChallengesSchema = pgTable("weekly_challenges", {
  weekStart: date("week_start", { mode: "string" }).primaryKey(),
  problemId: uuid("problem_id")
    .notNull()
    .references(() => problemsSchema.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type WeeklyChallengeRow = typeof weeklyChallengesSchema.$inferSelect;
