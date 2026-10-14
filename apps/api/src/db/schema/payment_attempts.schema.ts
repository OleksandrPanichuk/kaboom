import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

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
    stripeChargeId: text("stripe_charge_id").notNull().unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeCustomerId: text("stripe_customer_id"),
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
    stripeBalanceTransactionId: text("stripe_balance_transaction_id"),
    fee: bigint("fee", { mode: "number" }),
    net: bigint("net", { mode: "number" }),
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
    index("payment_attempts_payment_intent_idx").on(
      table.stripePaymentIntentId,
      table.stripeCreatedAt,
    ),
  ],
);

export type PaymentAttemptRow = typeof paymentAttemptsSchema.$inferSelect;
