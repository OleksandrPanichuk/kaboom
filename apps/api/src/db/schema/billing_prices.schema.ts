import {
  bigint,
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const PLAN_KEYS = ["pro"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const PRICE_TYPES = ["recurring", "one_time"] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

export const PRICE_INTERVALS = ["day", "week", "month", "year"] as const;
export type PriceInterval = (typeof PRICE_INTERVALS)[number];

export const TAX_BEHAVIORS = ["inclusive", "exclusive", "unspecified"] as const;
export type TaxBehavior = (typeof TAX_BEHAVIORS)[number];

export const billingPricesSchema = pgTable("billing_prices", {
  id: uuid("id").primaryKey().defaultRandom(),
  stripePriceId: text("stripe_price_id").notNull().unique(),
  lookupKey: text("lookup_key").unique(),
  planKey: text("plan_key", { enum: PLAN_KEYS }).notNull(),
  type: text("type", { enum: PRICE_TYPES }).notNull(),
  interval: text("interval", { enum: PRICE_INTERVALS }),
  intervalCount: integer("interval_count"),
  unitAmount: bigint("unit_amount", { mode: "number" }).notNull(),
  currency: text("currency").notNull(),
  taxBehavior: text("tax_behavior", { enum: TAX_BEHAVIORS })
    .notNull()
    .default("unspecified"),
  active: boolean("active").notNull(),
  stripeSyncedAt: timestamp("stripe_synced_at", {
    withTimezone: true,
  }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BillingPriceRow = typeof billingPricesSchema.$inferSelect;
