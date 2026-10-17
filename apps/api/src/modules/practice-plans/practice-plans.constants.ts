import { DAY, MINUTE } from "@/constants";

export const PLAN_SIZE = 3;

export const WEEK_MS = 7 * DAY;

export const REMIND_PRACTICE_PLANS_PATTERN = "0 10 * * 4";

export const PRACTICE_PLANS_QUEUE = "practice-plans";

export const PracticePlansQueueJobs = {
  Remind: "practice-plans.remind",
} as const;

export const START_PLAN_RATE_LIMIT = {
  limit: 20,
  windowMs: 10 * MINUTE,
  scope: "practice-plans:start",
} as const;
