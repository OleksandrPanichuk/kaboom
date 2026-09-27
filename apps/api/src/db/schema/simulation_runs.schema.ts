import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { designsSchema } from "./designs.schema";

export const simulationRunsSchema = pgTable(
  "simulation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    designId: uuid("design_id")
      .notNull()
      .references(() => designsSchema.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    graphHash: text("graph_hash").notNull(),
    scenario: jsonb("scenario").$type<unknown>().notNull(),
    findings: jsonb("findings").$type<unknown[]>().notNull(),
    summary: jsonb("summary").$type<unknown>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("simulation_runs_design_id_created_at_idx").on(
      table.designId,
      table.createdAt,
      table.id,
    ),
  ],
);

export type SimulationRunRow = typeof simulationRunsSchema.$inferSelect;
