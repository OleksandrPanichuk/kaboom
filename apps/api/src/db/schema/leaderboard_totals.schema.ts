import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { usersSchema } from "./users.schema";

export const leaderboardTotalsSchema = pgTable(
  "leaderboard_totals",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    points: integer("points").notNull(),
    solved: integer("solved").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.scope] }),
    index("leaderboard_totals_scope_points_idx").on(
      table.scope,
      table.points.desc(),
      table.userId,
    ),
  ],
);

export type LeaderboardTotalsRow = typeof leaderboardTotalsSchema.$inferSelect;
