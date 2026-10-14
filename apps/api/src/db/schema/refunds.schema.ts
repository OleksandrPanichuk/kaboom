import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { usersSchema } from "./users.schema";

export const REFUND_STATUSES = [
  "pending",
  "requires_action",
  "succeeded",
  "failed",
  "canceled",
] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const refundsSchema = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => usersSchema.id, {
      onDelete: "set null",
    }),
    stripeRefundId: text("stripe_refund_id").notNull().unique(),
    stripeChargeId: text("stripe_charge_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeInvoiceId: text("stripe_invoice_id"),
    stripeCreditNoteId: text("stripe_credit_note_id"),
    status: text("status", { enum: REFUND_STATUSES }).notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    reason: text("reason"),
    failureReason: text("failure_reason"),
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
    index("refunds_payment_intent_idx").on(table.stripePaymentIntentId),
    index("refunds_user_created_idx").on(table.userId, table.stripeCreatedAt),
  ],
);

export type RefundRow = typeof refundsSchema.$inferSelect;
