import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  SUBSCRIPTION_STATUSES,
  subscriptionsSchema,
} from "./subscriptions.schema";
import { usersSchema } from "./users.schema";

export const SUBSCRIPTION_CHANGE_KINDS = [
  "created",
  "plan_changed",
  "quantity_changed",
  "status_changed",
  "cancel_scheduled",
  "cancel_unscheduled",
  "canceled",
  "renewed",
  "paused",
  "resumed",
] as const;
export type SubscriptionChangeKind = (typeof SUBSCRIPTION_CHANGE_KINDS)[number];

export const SUBSCRIPTION_CHANGE_ACTORS = ["user", "system", "stripe"] as const;
export type SubscriptionChangeActor =
  (typeof SUBSCRIPTION_CHANGE_ACTORS)[number];

export const subscriptionChangesSchema = pgTable(
  "subscription_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptionsSchema.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: SUBSCRIPTION_CHANGE_KINDS }).notNull(),
    fromStatus: text("from_status", { enum: SUBSCRIPTION_STATUSES }),
    toStatus: text("to_status", { enum: SUBSCRIPTION_STATUSES }),
    fromStripePriceId: text("from_stripe_price_id"),
    toStripePriceId: text("to_stripe_price_id"),
    fromQuantity: integer("from_quantity"),
    toQuantity: integer("to_quantity"),
    actor: text("actor", { enum: SUBSCRIPTION_CHANGE_ACTORS }).notNull(),
    actorUserId: uuid("actor_user_id").references(() => usersSchema.id, {
      onDelete: "set null",
    }),
    stripeEventId: text("stripe_event_id"),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("subscription_changes_event_kind_idx").on(
      table.subscriptionId,
      table.stripeEventId,
      table.kind,
    ),
    index("subscription_changes_subscription_effective_at_idx").on(
      table.subscriptionId,
      table.effectiveAt,
      table.id,
    ),
  ],
);

export type SubscriptionChangeRow =
  typeof subscriptionChangesSchema.$inferSelect;
