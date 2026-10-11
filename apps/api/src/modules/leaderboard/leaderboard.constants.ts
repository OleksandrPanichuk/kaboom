import { DAY } from "@/constants";

export const LEADERBOARD_PERIODS = ["all", "week"] as const;

export type LeaderboardPeriod = (typeof LEADERBOARD_PERIODS)[number];

export const LEADERBOARD_SIZE = 50;

export const WEEK_MS = 7 * DAY;
