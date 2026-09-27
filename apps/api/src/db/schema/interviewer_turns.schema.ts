import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { interviewsSchema } from "./interviews.schema";

export const INTERVIEWER_TURN_STATUSES = [
  "running",
  "done",
  "interrupted",
  "failed",
] as const;

export type InterviewerTurnStatus = (typeof INTERVIEWER_TURN_STATUSES)[number];

export const interviewerTurnsSchema = pgTable(
  "interviewer_turns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    interviewId: uuid("interview_id")
      .notNull()
      .references(() => interviewsSchema.id, { onDelete: "cascade" }),
    triggers: jsonb("triggers").$type<string[]>().notNull(),
    status: text("status", { enum: INTERVIEWER_TURN_STATUSES })
      .notNull()
      .default("running"),
    error: text("error"),
    tokens: integer("tokens").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [
    index("interviewer_turns_interview_id_started_at_idx").on(
      table.interviewId,
      table.startedAt,
    ),
  ],
);

export type InterviewerTurnRow = typeof interviewerTurnsSchema.$inferSelect;
