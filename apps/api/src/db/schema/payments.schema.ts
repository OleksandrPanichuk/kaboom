import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { usersSchema } from "./users.schema";

export const PAYMENT_STATUSES = [
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
  "processing",
  "requires_capture",
  "canceled",
  "succeeded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const paymentsSchema = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => usersSchema.id, {
      onDelete: "set null",
    }),
    stripePaymentIntentId: text("stripe_payment_intent_id").notNull().unique(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeInvoiceId: text("stripe_invoice_id"),
    status: text("status", { enum: PAYMENT_STATUSES }).notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    amountReceived: bigint("amount_received", { mode: "number" })
      .notNull()
      .default(0),
    currency: text("currency").notNull(),
    paymentMethodType: text("payment_method_type"),
    cardBrand: text("card_brand"),
    cardLast4: text("card_last4"),
    failureCode: text("failure_code"),
    declineCode: text("decline_code"),
    failureMessage: text("failure_message"),
    succeededAt: timestamp("succeeded_at", { withTimezone: true }),
    stripeCreatedAt: timestamp("stripe_created_at", {
      withTimezone: true,
    }).notNull(),
    stripeSyncedAt: timestamp("stripe_synced_at", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("payments_user_created_idx").on(
      table.userId,
      table.stripeCreatedAt,
      table.id,
    ),
    index("payments_stripe_invoice_id_idx").on(table.stripeInvoiceId),
  ],
);

export type PaymentRow = typeof paymentsSchema.$inferSelect;
