import { MINUTE } from "@/constants";

export const MAX_STARS = 5;

export const RATE_PROBLEM_RATE_LIMIT = {
  limit: 30,
  windowMs: MINUTE,
  scope: "problem-ratings:rate",
} as const;
