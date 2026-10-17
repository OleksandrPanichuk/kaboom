import { boolean, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { usersSchema } from "./users.schema";

export const emailPreferencesSchema = pgTable("email_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersSchema.id, { onDelete: "cascade" }),
  comments: boolean("comments").notNull().default(true),
  reminders: boolean("reminders").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EmailPreferencesRow = typeof emailPreferencesSchema.$inferSelect;
