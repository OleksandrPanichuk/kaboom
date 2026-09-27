import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { usersSchema } from "./users.schema";

export const PROBLEM_SOURCES = ["official", "community"] as const;
export type ProblemSource = (typeof PROBLEM_SOURCES)[number];

export const PROBLEM_STATUSES = ["draft", "published"] as const;
export type ProblemStatus = (typeof PROBLEM_STATUSES)[number];

export const PROBLEM_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type ProblemDifficulty = (typeof PROBLEM_DIFFICULTIES)[number];

export const problemsSchema = pgTable(
  "problems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    source: text("source", { enum: PROBLEM_SOURCES }).notNull(),
    authorId: uuid("author_id").references(() => usersSchema.id, {
      onDelete: "set null",
    }),
    status: text("status", { enum: PROBLEM_STATUSES }).notNull(),
    track: text("track").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    difficulty: text("difficulty", { enum: PROBLEM_DIFFICULTIES }).notNull(),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    currentVersion: integer("current_version").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("problems_status_created_at_idx").on(
      table.status,
      table.createdAt,
      table.id,
    ),
  ],
);

export type ProblemRow = typeof problemsSchema.$inferSelect;
