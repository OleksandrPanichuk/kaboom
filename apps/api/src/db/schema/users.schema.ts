import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { timeOrderedId } from "../time-ordered-id";

export const USER_ROLES = ["user", "moderator", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const usersSchema = pgTable("users", {
  id: timeOrderedId(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: USER_ROLES }).notNull().default("user"),
  emailVerifiedAt: timestamp("email_verified_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserRow = typeof usersSchema.$inferSelect;
export type InsertUserRow = typeof usersSchema.$inferInsert;
