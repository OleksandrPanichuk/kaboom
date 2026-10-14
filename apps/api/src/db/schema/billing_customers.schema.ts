import {
  bigint,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { BILLING_PROVIDERS } from "./billing_events.schema";
import { usersSchema } from "./users.schema";

export const TAX_EXEMPT_STATUSES = ["none", "exempt", "reverse"] as const;
export type TaxExemptStatus = (typeof TAX_EXEMPT_STATUSES)[number];

export const billingCustomersSchema = pgTable(
  "billing_customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => usersSchema.id, {
      onDelete: "set null",
    }),
    provider: text("provider", { enum: BILLING_PROVIDERS }).notNull(),
    providerCustomerId: text("provider_customer_id").notNull(),
    email: text("email"),
    name: text("name"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    addressCity: text("address_city"),
    addressState: text("address_state"),
    addressPostalCode: text("address_postal_code"),
    addressCountry: text("address_country"),
    providerPaymentMethodId: text("provider_payment_method_id"),
    cardBrand: text("card_brand"),
    cardLast4: text("card_last4"),
    taxExempt: text("tax_exempt", { enum: TAX_EXEMPT_STATUSES })
      .notNull()
      .default("none"),
    balance: bigint("balance", { mode: "number" }).notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("billing_customers_provider_provider_customer_id_idx").on(
      table.provider,
      table.providerCustomerId,
    ),
    uniqueIndex("billing_customers_provider_user_idx").on(
      table.provider,
      table.userId,
    ),
  ],
);

export type BillingCustomerRow = typeof billingCustomersSchema.$inferSelect;
