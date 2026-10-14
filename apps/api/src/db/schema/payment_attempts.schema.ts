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

export const PAYMENT_ATTEMPT_STATUSES = [
  "pending",
  "succeeded",
  "failed",
] as const;
export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number];

export const paymentAttemptsSchema = pgTable(
  "payment_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider", { enum: BILLING_PROVIDERS }).notNull(),
    providerAttemptId: text("provider_attempt_id").notNull(),
    providerPaymentId: text("provider_payment_id"),
    providerCustomerId: text("provider_customer_id"),
    status: text("status", { enum: PAYMENT_ATTEMPT_STATUSES }).notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    amountRefunded: bigint("amount_refunded", { mode: "number" })
      .notNull()
      .default(0),
    currency: text("currency").notNull(),
    outcomeType: text("outcome_type"),
    riskLevel: text("risk_level"),
    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),
    providerTransactionId: text("provider_transaction_id"),
    fee: bigint("fee", { mode: "number" }),
    net: bigint("net", { mode: "number" }),
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
    uniqueIndex("payment_attempts_provider_provider_attempt_id_idx").on(
      table.provider,
      table.providerAttemptId,
    ),
    index("payment_attempts_payment_idx").on(
      table.provider,
      table.providerPaymentId,
      table.providerCreatedAt,
    ),
  ],
);

export type PaymentAttemptRow = typeof paymentAttemptsSchema.$inferSelect;
