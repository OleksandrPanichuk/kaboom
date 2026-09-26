import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { designsSchema } from "./designs.schema";

export const DESIGN_REVISION_AUTHORS = [
  "system",
  "user",
  "interviewer",
] as const;

export type DesignRevisionAuthor = (typeof DESIGN_REVISION_AUTHORS)[number];

export const designRevisionsSchema = pgTable(
  "design_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    designId: uuid("design_id")
      .notNull()
      .references(() => designsSchema.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    author: text("author", { enum: DESIGN_REVISION_AUTHORS }).notNull(),
    ops: jsonb("ops").$type<unknown[]>().notNull(),
    inverse: jsonb("inverse").$type<unknown[]>().notNull(),
    snapshot: jsonb("snapshot").$type<unknown>(),
    graphHash: text("graph_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("design_revisions_design_id_number_idx").on(
      table.designId,
      table.number,
    ),
  ],
);

export type DesignRevisionRow = typeof designRevisionsSchema.$inferSelect;
