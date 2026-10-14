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
    provider: text("provider", { enum: BILLING_PROVIDERS }).notNull(),
    providerPaymentId: text("provider_payment_id").notNull(),
    providerCustomerId: text("provider_customer_id"),
    providerInvoiceId: text("provider_invoice_id"),
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
    uniqueIndex("payments_provider_provider_payment_id_idx").on(
      table.provider,
      table.providerPaymentId,
    ),
    index("payments_user_created_idx").on(
      table.userId,
      table.providerCreatedAt,
      table.id,
    ),
    index("payments_invoice_idx").on(table.provider, table.providerInvoiceId),
  ],
);

export type PaymentRow = typeof paymentsSchema.$inferSelect;
