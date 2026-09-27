import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { interviewsSchema } from "./interviews.schema";

export const INTERVIEW_MESSAGE_AUTHORS = [
  "user",
  "interviewer",
  "system",
] as const;

export type InterviewMessageAuthor = (typeof INTERVIEW_MESSAGE_AUTHORS)[number];

export const interviewMessagesSchema = pgTable(
  "interview_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    interviewId: uuid("interview_id")
      .notNull()
      .references(() => interviewsSchema.id, { onDelete: "cascade" }),
    author: text("author", { enum: INTERVIEW_MESSAGE_AUTHORS }).notNull(),
    body: text("body").notNull(),
    turnId: uuid("turn_id"),
    interrupted: boolean("interrupted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("interview_messages_interview_id_created_at_idx").on(
      table.interviewId,
      table.createdAt,
      table.id,
    ),
  ],
);

export type InterviewMessageRow = typeof interviewMessagesSchema.$inferSelect;
