import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { usersSchema } from "./users.schema";

export const billingTaxIdsSchema = pgTable(
  "billing_tax_ids",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => usersSchema.id, {
      onDelete: "set null",
    }),
    stripeTaxId: text("stripe_tax_id").notNull().unique(),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    type: text("type").notNull(),
    value: text("value").notNull(),
    verificationStatus: text("verification_status"),
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
  (table) => [index("billing_tax_ids_customer_idx").on(table.stripeCustomerId)],
);

export type BillingTaxIdRow = typeof billingTaxIdsSchema.$inferSelect;
