import type { Track } from "@repo/design";
import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { problemDraftsSchema } from "./problem_drafts.schema";
import { PROBLEM_DIFFICULTIES } from "./problems.schema";
import { usersSchema } from "./users.schema";

export const PROBLEM_REVIEW_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
] as const;
export type ProblemReviewStatus = (typeof PROBLEM_REVIEW_STATUSES)[number];

export const problemReviewsSchema = pgTable(
  "problem_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => problemDraftsSchema.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    track: text("track").$type<Track>().notNull(),
    difficulty: text("difficulty", { enum: PROBLEM_DIFFICULTIES }).notNull(),
    content: jsonb("content").$type<unknown>().notNull(),
    contentHash: text("content_hash").notNull(),
    status: text("status", { enum: PROBLEM_REVIEW_STATUSES })
      .notNull()
      .default("pending"),
    reviewerId: uuid("reviewer_id").references(() => usersSchema.id, {
      onDelete: "set null",
    }),
    feedback: text("feedback"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("problem_reviews_one_pending_per_draft_idx")
      .on(table.draftId)
      .where(sql`${table.status} = 'pending'`),
    index("problem_reviews_status_submitted_at_idx").on(
      table.status,
      table.submittedAt,
      table.id,
    ),
    index("problem_reviews_draft_id_submitted_at_idx").on(
      table.draftId,
      table.submittedAt,
    ),
  ],
);

export type ProblemReviewRow = typeof problemReviewsSchema.$inferSelect;
