import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { BILLING_PROVIDERS } from "./billing_events.schema";
import { billingOffersSchema } from "./billing_offers.schema";

export const PLAN_KEYS = ["pro"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

export const PRICE_TYPES = ["recurring", "one_time"] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

export const PRICE_INTERVALS = ["day", "week", "month", "year"] as const;
export type PriceInterval = (typeof PRICE_INTERVALS)[number];

export const TAX_BEHAVIORS = ["inclusive", "exclusive", "unspecified"] as const;
export type TaxBehavior = (typeof TAX_BEHAVIORS)[number];

export const billingPricesSchema = pgTable(
  "billing_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider", { enum: BILLING_PROVIDERS }).notNull(),
    providerPriceId: text("provider_price_id").notNull(),
    offerId: uuid("offer_id").references(() => billingOffersSchema.id, {
      onDelete: "set null",
    }),
    lookupKey: text("lookup_key"),
    type: text("type", { enum: PRICE_TYPES }).notNull(),
    interval: text("interval", { enum: PRICE_INTERVALS }),
    intervalCount: integer("interval_count"),
    unitAmount: bigint("unit_amount", { mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    taxBehavior: text("tax_behavior", { enum: TAX_BEHAVIORS })
      .notNull()
      .default("unspecified"),
    active: boolean("active").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("billing_prices_offer_idx").on(table.provider, table.offerId),
    uniqueIndex("billing_prices_provider_provider_price_id_idx").on(
      table.provider,
      table.providerPriceId,
    ),
    uniqueIndex("billing_prices_provider_lookup_key_idx").on(
      table.provider,
      table.lookupKey,
    ),
  ],
);

export type BillingPriceRow = typeof billingPricesSchema.$inferSelect;
