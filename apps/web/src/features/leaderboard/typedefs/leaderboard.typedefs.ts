import type { Track } from "@repo/design";

export type LeaderboardPeriod = "all" | "week";

export interface LeaderboardSearch {
  period?: LeaderboardPeriod;
  track?: Track;
}

export interface LeaderboardFilter {
  period: LeaderboardPeriod;
  track: Track | null;
}
