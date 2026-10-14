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

export const disputesSchema = pgTable(
  "disputes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => usersSchema.id, {
      onDelete: "set null",
    }),
    provider: text("provider", { enum: BILLING_PROVIDERS }).notNull(),
    providerDisputeId: text("provider_dispute_id").notNull(),
    providerAttemptId: text("provider_attempt_id").notNull(),
    providerPaymentId: text("provider_payment_id"),
    status: text("status").notNull(),
    reason: text("reason").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    evidenceDueBy: timestamp("evidence_due_by", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
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
    uniqueIndex("disputes_provider_provider_dispute_id_idx").on(
      table.provider,
      table.providerDisputeId,
    ),
    index("disputes_attempt_idx").on(table.provider, table.providerAttemptId),
  ],
);

export type DisputeRow = typeof disputesSchema.$inferSelect;
