import { bigint, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { usersSchema } from "./users.schema";

export const TAX_EXEMPT_STATUSES = ["none", "exempt", "reverse"] as const;
export type TaxExemptStatus = (typeof TAX_EXEMPT_STATUSES)[number];

export const billingCustomersSchema = pgTable("billing_customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .unique()
    .references(() => usersSchema.id, { onDelete: "set null" }),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  email: text("email"),
  name: text("name"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  addressCity: text("address_city"),
  addressState: text("address_state"),
  addressPostalCode: text("address_postal_code"),
  addressCountry: text("address_country"),
  defaultPaymentMethodId: text("default_payment_method_id"),
  cardBrand: text("card_brand"),
  cardLast4: text("card_last4"),
  taxExempt: text("tax_exempt", { enum: TAX_EXEMPT_STATUSES })
    .notNull()
    .default("none"),
  balance: bigint("balance", { mode: "number" }).notNull().default(0),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  stripeSyncedAt: timestamp("stripe_synced_at", {
    withTimezone: true,
  }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type BillingCustomerRow = typeof billingCustomersSchema.$inferSelect;
