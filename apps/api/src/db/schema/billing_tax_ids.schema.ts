import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { BILLING_PROVIDERS } from "./billing_events.schema";
import { usersSchema } from "./users.schema";

export const billingTaxIdsSchema = pgTable(
  "billing_tax_ids",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => usersSchema.id, {
      onDelete: "set null",
    }),
    provider: text("provider", { enum: BILLING_PROVIDERS }).notNull(),
    providerTaxId: text("provider_tax_id").notNull(),
    providerCustomerId: text("provider_customer_id").notNull(),
    type: text("type").notNull(),
    value: text("value").notNull(),
    verificationStatus: text("verification_status"),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("billing_tax_ids_provider_provider_tax_id_idx").on(
      table.provider,
      table.providerTaxId,
    ),
    index("billing_tax_ids_customer_idx").on(
      table.provider,
      table.providerCustomerId,
    ),
  ],
);

export type BillingTaxIdRow = typeof billingTaxIdsSchema.$inferSelect;
