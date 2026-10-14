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

export const INVOICE_STATUSES = [
  "draft",
  "open",
  "paid",
  "uncollectible",
  "void",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const invoicesSchema = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => usersSchema.id, {
      onDelete: "set null",
    }),
    provider: text("provider", { enum: BILLING_PROVIDERS }).notNull(),
    providerInvoiceId: text("provider_invoice_id").notNull(),
    providerCustomerId: text("provider_customer_id").notNull(),
    providerSubscriptionId: text("provider_subscription_id"),
    number: text("number"),
    status: text("status", { enum: INVOICE_STATUSES }).notNull(),
    billingReason: text("billing_reason"),
    currency: text("currency").notNull(),
    subtotal: bigint("subtotal", { mode: "number" }).notNull(),
    tax: bigint("tax", { mode: "number" }).notNull().default(0),
    total: bigint("total", { mode: "number" }).notNull(),
    amountDue: bigint("amount_due", { mode: "number" }).notNull(),
    amountPaid: bigint("amount_paid", { mode: "number" }).notNull(),
    amountRemaining: bigint("amount_remaining", { mode: "number" }).notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    customerName: text("customer_name"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    addressCity: text("address_city"),
    addressState: text("address_state"),
    addressPostalCode: text("address_postal_code"),
    addressCountry: text("address_country"),
    hostedInvoiceUrl: text("hosted_invoice_url"),
    invoicePdfUrl: text("invoice_pdf_url"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
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
    uniqueIndex("invoices_provider_provider_invoice_id_idx").on(
      table.provider,
      table.providerInvoiceId,
    ),
    index("invoices_user_created_idx").on(
      table.userId,
      table.providerCreatedAt,
      table.id,
    ),
    index("invoices_subscription_idx").on(
      table.provider,
      table.providerSubscriptionId,
    ),
  ],
);

export type InvoiceRow = typeof invoicesSchema.$inferSelect;
