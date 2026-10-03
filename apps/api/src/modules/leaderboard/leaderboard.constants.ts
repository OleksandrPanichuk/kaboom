import { DAY, MINUTE } from "@/constants";

export const LEADERBOARD_PERIODS = ["all", "week"] as const;

export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number];

export const LEADERBOARD_SIZE = 50;

export const WEEK_MS = 7 * DAY;

export const SOLVED_SCORE = 80;

export const HANDLE_PATTERN = "^[a-z0-9](?:[a-z0-9_-]{1,18}[a-z0-9])$";

export const SAVE_PROFILE_RATE_LIMIT = {
  limit: 10,
  windowMs: 10 * MINUTE,
  scope: "leaderboard:profile",
} as const;
