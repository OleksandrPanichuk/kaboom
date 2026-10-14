import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const STRIPE_EVENT_STATUSES = [
  "pending",
  "processed",
  "failed",
  "ignored",
] as const;
export type StripeEventStatus = (typeof STRIPE_EVENT_STATUSES)[number];

export const stripeEventsSchema = pgTable(
  "stripe_events",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    objectId: text("object_id"),
    livemode: boolean("livemode").notNull(),
    apiVersion: text("api_version"),
    payload: jsonb("payload").$type<unknown>().notNull(),
    status: text("status", { enum: STRIPE_EVENT_STATUSES })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    stripeCreatedAt: timestamp("stripe_created_at", {
      withTimezone: true,
    }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    index("stripe_events_status_received_at_idx").on(
      table.status,
      table.receivedAt,
    ),
    index("stripe_events_object_id_idx").on(table.objectId),
  ],
);

export type StripeEventRow = typeof stripeEventsSchema.$inferSelect;
