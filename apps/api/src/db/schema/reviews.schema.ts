import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { interviewsSchema } from "./interviews.schema";
import { problemsSchema } from "./problems.schema";
import { usersSchema } from "./users.schema";

export const reviewsSchema = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  interviewId: uuid("interview_id")
    .notNull()
    .unique()
    .references(() => interviewsSchema.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersSchema.id, { onDelete: "cascade" }),
  problemId: uuid("problem_id")
    .notNull()
    .references(() => problemsSchema.id, { onDelete: "cascade" }),
  problemVersion: integer("problem_version").notNull(),
  revision: integer("revision").notNull(),
  score: integer("score"),
  designScore: integer("design_score").notNull(),
  summary: text("summary").notNull(),
  strengths: jsonb("strengths").$type<string[]>().notNull(),
  improvements: jsonb("improvements").$type<string[]>().notNull(),
  items: jsonb("items").$type<unknown[]>().notNull(),
  checks: jsonb("checks").$type<unknown[]>().notNull(),
  drills: jsonb("drills").$type<unknown[]>().notNull(),
  model: text("model").notNull(),
  promptVersion: integer("prompt_version").notNull(),
  tokens: integer("tokens").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ReviewRow = typeof reviewsSchema.$inferSelect;
