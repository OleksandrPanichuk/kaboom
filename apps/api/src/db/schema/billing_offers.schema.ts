import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import {
  PLAN_KEYS,
  PRICE_INTERVALS,
  PRICE_TYPES,
} from "./billing_prices.schema";

export const billingOffersSchema = pgTable("billing_offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  planKey: text("plan_key", { enum: PLAN_KEYS }).notNull(),
  type: text("type", { enum: PRICE_TYPES }).notNull(),
  interval: text("interval", { enum: PRICE_INTERVALS }),
  intervalCount: integer("interval_count"),
  lookupKey: text("lookup_key").notNull().unique(),
  active: boolean("active").notNull().default(true),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BillingOfferRow = typeof billingOffersSchema.$inferSelect;
