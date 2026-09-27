import {
  date,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { usersSchema } from "./users.schema";

export const llmUsageSchema = pgTable(
  "llm_usage",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    tokens: integer("tokens").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.day] })],
);

export type LlmUsageRow = typeof llmUsageSchema.$inferSelect;
