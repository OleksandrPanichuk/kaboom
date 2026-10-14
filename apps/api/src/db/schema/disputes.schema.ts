import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { usersSchema } from "./users.schema";

export const disputesSchema = pgTable(
  "disputes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => usersSchema.id, {
      onDelete: "set null",
    }),
    stripeDisputeId: text("stripe_dispute_id").notNull().unique(),
    stripeChargeId: text("stripe_charge_id").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    status: text("status").notNull(),
    reason: text("reason").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currency: text("currency").notNull(),
    evidenceDueBy: timestamp("evidence_due_by", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
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
  (table) => [index("disputes_charge_idx").on(table.stripeChargeId)],
);

export type DisputeRow = typeof disputesSchema.$inferSelect;
