import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const BILLING_PROVIDERS = ["stripe"] as const;
export type BillingProviderName = (typeof BILLING_PROVIDERS)[number];

export const BILLING_EVENT_TOPICS = [
  "customer",
  "subscription",
  "invoice",
  "payment",
  "refund",
  "dispute",
  "tax_id",
] as const;
export type BillingEventTopic = (typeof BILLING_EVENT_TOPICS)[number];

export const BILLING_EVENT_STATUSES = [
  "pending",
  "processed",
  "failed",
  "ignored",
] as const;
export type BillingEventStatus = (typeof BILLING_EVENT_STATUSES)[number];

export const billingEventsSchema = pgTable(
  "billing_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider", { enum: BILLING_PROVIDERS }).notNull(),
    providerEventId: text("provider_event_id").notNull(),
    type: text("type").notNull(),
    topic: text("topic", { enum: BILLING_EVENT_TOPICS }),
    providerObjectId: text("provider_object_id"),
    live: boolean("live").notNull(),
    payload: jsonb("payload").$type<unknown>().notNull(),
    status: text("status", { enum: BILLING_EVENT_STATUSES })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    providerCreatedAt: timestamp("provider_created_at", {
      withTimezone: true,
    }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("billing_events_provider_provider_event_id_idx").on(
      table.provider,
      table.providerEventId,
    ),
    index("billing_events_status_received_at_idx").on(
      table.status,
      table.receivedAt,
    ),
    index("billing_events_provider_object_idx").on(
      table.provider,
      table.providerObjectId,
    ),
  ],
);

export type BillingEventRow = typeof billingEventsSchema.$inferSelect;
