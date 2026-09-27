import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { interviewsSchema } from "./interviews.schema";

export const INTERVIEW_EVENT_TYPES = [
  "message",
  "revision",
  "phase",
  "simulation",
  "highlight",
  "status",
] as const;

export type InterviewEventType = (typeof INTERVIEW_EVENT_TYPES)[number];

export const interviewEventsSchema = pgTable(
  "interview_events",
  {
    interviewId: uuid("interview_id")
      .notNull()
      .references(() => interviewsSchema.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    type: text("type", { enum: INTERVIEW_EVENT_TYPES }).notNull(),
    payload: jsonb("payload").$type<unknown>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.interviewId, table.seq] })],
);

export type InterviewEventRow = typeof interviewEventsSchema.$inferSelect;
