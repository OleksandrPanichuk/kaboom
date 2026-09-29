import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { designsSchema } from "./designs.schema";
import { problemAttemptsSchema } from "./problem_attempts.schema";
import { problemsSchema } from "./problems.schema";
import { usersSchema } from "./users.schema";

export const SUBMISSION_REVIEW_STATUSES = [
  "pending",
  "reviewed",
  "failed",
  "skipped",
] as const;

export type SubmissionReviewStatus =
  (typeof SUBMISSION_REVIEW_STATUSES)[number];

export const submissionsSchema = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => problemAttemptsSchema.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problemsSchema.id, { onDelete: "cascade" }),
    problemVersion: integer("problem_version").notNull(),
    designId: uuid("design_id")
      .notNull()
      .references(() => designsSchema.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    graphHash: text("graph_hash").notNull(),
    score: integer("score").notNull(),
    deterministicScore: integer("deterministic_score").notNull().default(0),
    reviewStatus: text("review_status", { enum: SUBMISSION_REVIEW_STATUSES })
      .notNull()
      .default("skipped"),
    reviewScore: integer("review_score"),
    review: jsonb("review").$type<unknown>(),
    reviewModel: text("review_model"),
    reviewPromptVersion: integer("review_prompt_version"),
    hintPenalty: integer("hint_penalty").notNull().default(0),
    counted: boolean("counted").notNull().default(true),
    graph: jsonb("graph").$type<unknown>(),
    items: jsonb("items").$type<unknown[]>().notNull(),
    drills: jsonb("drills").$type<unknown[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("submissions_user_id_problem_id_created_at_idx").on(
      table.userId,
      table.problemId,
      table.createdAt,
      table.id,
    ),
    index("submissions_problem_id_score_idx").on(table.problemId, table.score),
  ],
);

export type SubmissionRow = typeof submissionsSchema.$inferSelect;
