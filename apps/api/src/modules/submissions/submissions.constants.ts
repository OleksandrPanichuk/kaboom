import { DAY, MINUTE } from "@/constants";
import type { ProblemDifficulty } from "@/db";

export const SUBMIT_RATE_LIMIT = {
  limit: 10,
  windowMs: MINUTE,
  scope: "submissions:submit",
} as const;

export const RUN_RATE_LIMIT = {
  limit: 60,
  windowMs: MINUTE,
  scope: "submissions:run",
} as const;

export const DIFFICULTY_WEIGHT: Readonly<Record<ProblemDifficulty, number>> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export const RANKS = [
  { name: "Junior", points: 0 },
  { name: "Middle", points: 100 },
  { name: "Senior", points: 300 },
  { name: "Staff", points: 600 },
  { name: "Principal", points: 1_000 },
] as const;

export const SOLUTION_LOCK_MS = 7 * DAY;

export const MIN_SOLUTION_SCORE = 80;

export const SOLUTIONS_SHOWN = 20;

export const REVEAL_RATE_LIMIT = {
  limit: 20,
  windowMs: MINUTE,
  scope: "submissions:reveal",
} as const;

export const DESIGN_REVIEW_WEIGHT = 0.3;
