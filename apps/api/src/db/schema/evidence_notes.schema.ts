import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { interviewMessagesSchema } from "./interview_messages.schema";
import { interviewsSchema } from "./interviews.schema";

export const evidenceNotesSchema = pgTable(
  "evidence_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    interviewId: uuid("interview_id")
      .notNull()
      .references(() => interviewsSchema.id, { onDelete: "cascade" }),
    rubricItemKey: text("rubric_item_key").notNull(),
    note: text("note").notNull(),
    quote: text("quote"),
    messageId: uuid("message_id").references(() => interviewMessagesSchema.id, {
      onDelete: "set null",
    }),
    revision: integer("revision"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("evidence_notes_interview_id_idx").on(table.interviewId)],
);

export type EvidenceNoteRow = typeof evidenceNotesSchema.$inferSelect;
