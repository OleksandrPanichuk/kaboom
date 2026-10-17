import type { Track } from "@repo/design";
import type { InterviewDimension } from "@repo/scoring";
import {
  date,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { timeOrderedId } from "../time-ordered-id";
import { usersSchema } from "./users.schema";

export const practicePlansSchema = pgTable(
  "practice_plans",
  {
    id: timeOrderedId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    weekStart: date("week_start", { mode: "string" }).notNull(),
    track: text("track").$type<Track>().notNull(),
    skill: text("skill").$type<InterviewDimension>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    remindedAt: timestamp("reminded_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("practice_plans_user_id_week_start_idx").on(
      table.userId,
      table.weekStart,
    ),
  ],
);

export type PracticePlanRow = typeof practicePlansSchema.$inferSelect;
