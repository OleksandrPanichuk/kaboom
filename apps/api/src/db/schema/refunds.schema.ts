import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { BILLING_PROVIDERS } from "./billing_events.schema";
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
    provider: text("provider", { enum: BILLING_PROVIDERS }).notNull(),
    providerRefundId: text("provider_refund_id").notNull(),
    providerAttemptId: text("provider_attempt_id"),
    providerPaymentId: text("provider_payment_id"),
    providerInvoiceId: text("provider_invoice_id"),
    providerCreditNoteId: text("provider_credit_note_id"),
    status: text("status", { enum: REFUND_STATUSES }).notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    reason: text("reason"),
    failureReason: text("failure_reason"),
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
    uniqueIndex("refunds_provider_provider_refund_id_idx").on(
      table.provider,
      table.providerRefundId,
    ),
    index("refunds_payment_idx").on(table.provider, table.providerPaymentId),
    index("refunds_user_created_idx").on(table.userId, table.providerCreatedAt),
  ],
);

export type RefundRow = typeof refundsSchema.$inferSelect;
