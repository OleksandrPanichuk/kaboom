import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { usersSchema } from "./users.schema";

export const leaderboardProfilesSchema = pgTable("leaderboard_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersSchema.id, { onDelete: "cascade" }),
  handle: text("handle").notNull().unique(),
  visible: boolean("visible").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LeaderboardProfileRow =
  typeof leaderboardProfilesSchema.$inferSelect;
