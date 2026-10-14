import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { usersSchema } from "./users.schema";

export const PURCHASE_STATUSES = [
  "pending",
  "paid",
  "partially_refunded",
  "refunded",
  "failed",
  "canceled",
] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export const purchasesSchema = pgTable(
  "purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => usersSchema.id, {
      onDelete: "set null",
    }),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    stripePriceId: text("stripe_price_id").notNull(),
    stripeInvoiceId: text("stripe_invoice_id").notNull().unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    status: text("status", { enum: PURCHASE_STATUSES })
      .notNull()
      .default("pending"),
    amount: bigint("amount", { mode: "number" }).notNull(),
    amountRefunded: bigint("amount_refunded", { mode: "number" })
      .notNull()
      .default(0),
    currency: text("currency").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("purchases_one_live_per_customer_idx")
      .on(table.stripeCustomerId)
      .where(sql`${table.status} in ('pending', 'paid', 'partially_refunded')`),
    index("purchases_user_id_idx").on(table.userId),
  ],
);

export type PurchaseRow = typeof purchasesSchema.$inferSelect;
