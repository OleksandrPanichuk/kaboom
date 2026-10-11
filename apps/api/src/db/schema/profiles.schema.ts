import { sql } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { usersSchema } from "./users.schema";

export const profilesSchema = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersSchema.id, { onDelete: "cascade" }),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio").notNull().default(""),
  links: text("links")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  avatarKey: text("avatar_key"),
  visible: boolean("visible").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ProfileRow = typeof profilesSchema.$inferSelect;
