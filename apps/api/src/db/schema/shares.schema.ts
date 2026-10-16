import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { usersSchema } from "./users.schema";

export const SHARE_SUBJECTS = ["design", "interview"] as const;
export type ShareSubject = (typeof SHARE_SUBJECTS)[number];

export const sharesSchema = pgTable(
  "shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: text("token").notNull().unique(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    subject: text("subject", { enum: SHARE_SUBJECTS }).notNull(),
    subjectId: uuid("subject_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("shares_live_subject_idx")
      .on(table.subject, table.subjectId)
      .where(sql`${table.revokedAt} is null`),
    index("shares_owner_id_idx").on(table.ownerId),
  ],
);

export type ShareRow = typeof sharesSchema.$inferSelect;
