import { sql } from "drizzle-orm";
import {
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
import { usersSchema } from "./users.schema";

export const SUBSCRIPTION_STATUSES = [
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const subscriptionsSchema = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => usersSchema.id, {
      onDelete: "set null",
    }),
    provider: text("provider", { enum: BILLING_PROVIDERS }).notNull(),
    providerSubscriptionId: text("provider_subscription_id").notNull(),
    providerCustomerId: text("provider_customer_id").notNull(),
    providerPriceId: text("provider_price_id").notNull(),
    status: text("status", { enum: SUBSCRIPTION_STATUSES }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    cancelAt: timestamp("cancel_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    trialStart: timestamp("trial_start", { withTimezone: true }),
    trialEnd: timestamp("trial_end", { withTimezone: true }),
    latestProviderInvoiceId: text("latest_provider_invoice_id"),
    providerCreatedAt: timestamp("provider_created_at", {
      withTimezone: true,
    }).notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("subscriptions_provider_provider_subscription_id_idx").on(
      table.provider,
      table.providerSubscriptionId,
    ),
    uniqueIndex("subscriptions_one_live_per_customer_idx")
      .on(table.provider, table.providerCustomerId)
      .where(sql`${table.status} not in ('canceled', 'incomplete_expired')`),
    index("subscriptions_user_id_idx").on(table.userId),
  ],
);

export type SubscriptionRow = typeof subscriptionsSchema.$inferSelect;
