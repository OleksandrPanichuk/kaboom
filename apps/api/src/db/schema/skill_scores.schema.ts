import {
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { interviewsSchema } from "./interviews.schema";
import { problemsSchema } from "./problems.schema";
import { reviewsSchema } from "./reviews.schema";
import { submissionsSchema } from "./submissions.schema";
import { usersSchema } from "./users.schema";

export const skillScoresSchema = pgTable(
  "skill_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersSchema.id, { onDelete: "cascade" }),
    skill: text("skill").notNull(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problemsSchema.id, { onDelete: "cascade" }),
    interviewId: uuid("interview_id").references(() => interviewsSchema.id, {
      onDelete: "cascade",
    }),
    reviewId: uuid("review_id").references(() => reviewsSchema.id, {
      onDelete: "cascade",
    }),
    submissionId: uuid("submission_id").references(() => submissionsSchema.id, {
      onDelete: "cascade",
    }),
    score: real("score").notNull(),
    weight: integer("weight").notNull(),
    scoringVersion: integer("scoring_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("skill_scores_interview_id_skill_unique").on(
      table.interviewId,
      table.skill,
    ),
    unique("skill_scores_submission_id_skill_unique").on(
      table.submissionId,
      table.skill,
    ),
    index("skill_scores_user_id_skill_idx").on(table.userId, table.skill),
  ],
);

export type SkillScoreRow = typeof skillScoresSchema.$inferSelect;
