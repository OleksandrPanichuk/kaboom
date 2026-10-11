import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const leaderboardStateSchema = pgTable("leaderboard_state", {
  id: integer("id").primaryKey(),
  fingerprint: text("fingerprint").notNull(),
  rebuiltAt: timestamp("rebuilt_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LeaderboardStateRow = typeof leaderboardStateSchema.$inferSelect;
