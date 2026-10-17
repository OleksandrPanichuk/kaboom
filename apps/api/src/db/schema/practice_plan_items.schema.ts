import { pgTable, primaryKey, smallint, uuid } from "drizzle-orm/pg-core";

import { practicePlansSchema } from "./practice_plans.schema";
import { problemsSchema } from "./problems.schema";

export const practicePlanItemsSchema = pgTable(
  "practice_plan_items",
  {
    planId: uuid("plan_id")
      .notNull()
      .references(() => practicePlansSchema.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problemsSchema.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.planId, table.position] })],
);

export type PracticePlanItemRow = typeof practicePlanItemsSchema.$inferSelect;
