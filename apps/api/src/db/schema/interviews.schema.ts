import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { designsSchema } from "./designs.schema";
import { problemsSchema } from "./problems.schema";
import { usersSchema } from "./users.schema";

export const INTERVIEW_STATUSES = [
  "active",
  "reviewing",
  "reviewed",
  "review_failed",
  "expired",
] as const;

export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const interviewsSchema = pgTable(
  "interviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problemsSchema.id, { onDelete: "cascade" }),
    problemVersion: integer("problem_version").notNull(),
    designId: uuid("design_id")
      .notNull()
      .unique()
      .references(() => designsSchema.id, { onDelete: "cascade" }),
    status: text("status", { enum: INTERVIEW_STATUSES })
      .notNull()
      .default("active"),
    phase: text("phase").notNull(),
    phaseStartedAt: timestamp("phase_started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    eventSeq: integer("event_seq").notNull().default(0),
    finalRevision: integer("final_revision"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [
    index("interviews_owner_id_started_at_idx").on(
      table.ownerId,
      table.startedAt,
      table.id,
    ),
  ],
);

export type InterviewRow = typeof interviewsSchema.$inferSelect;
