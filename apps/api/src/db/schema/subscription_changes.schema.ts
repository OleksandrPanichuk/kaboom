import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { billingEventsSchema } from "./billing_events.schema";
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

export const SUBSCRIPTION_CHANGE_ACTORS = [
  "user",
  "system",
  "provider",
] as const;
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
    fromProviderPriceId: text("from_provider_price_id"),
    toProviderPriceId: text("to_provider_price_id"),
    fromQuantity: integer("from_quantity"),
    toQuantity: integer("to_quantity"),
    actor: text("actor", { enum: SUBSCRIPTION_CHANGE_ACTORS }).notNull(),
    actorUserId: uuid("actor_user_id").references(() => usersSchema.id, {
      onDelete: "set null",
    }),
    billingEventId: uuid("billing_event_id").references(
      () => billingEventsSchema.id,
      { onDelete: "set null" },
    ),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("subscription_changes_event_kind_idx").on(
      table.subscriptionId,
      table.billingEventId,
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
