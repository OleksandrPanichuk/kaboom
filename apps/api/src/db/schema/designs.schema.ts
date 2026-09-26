import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { usersSchema } from "./users.schema";

export type DesignLayoutRow = Record<string, { x: number; y: number }>;

export const designsSchema = pgTable(
  "designs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    graph: jsonb("graph").$type<unknown>().notNull(),
    layout: jsonb("layout").$type<DesignLayoutRow>().notNull().default({}),
    revision: integer("revision").notNull().default(0),
    graphHash: text("graph_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("designs_owner_id_created_at_idx").on(
      table.ownerId,
      table.createdAt,
      table.id,
    ),
  ],
);

export type DesignRow = typeof designsSchema.$inferSelect;
