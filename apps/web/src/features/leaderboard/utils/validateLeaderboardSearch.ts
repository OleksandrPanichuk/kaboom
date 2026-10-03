import { type Track, TRACKS } from "@repo/design";

import type {
  LeaderboardPeriod,
  LeaderboardSearch,
} from "@/features/leaderboard/typedefs";

const isPeriod = (value: unknown): value is LeaderboardPeriod =>
  value === "all" || value === "week";

const isTrack = (value: unknown): value is Track =>
  typeof value === "string" && (TRACKS as readonly string[]).includes(value);

export const validateLeaderboardSearch = (
  search: Record<string, unknown>,
): LeaderboardSearch => ({
  ...(isPeriod(search.period) && search.period !== "all"
    ? { period: search.period }
    : {}),
  ...(isTrack(search.track) ? { track: search.track } : {}),
});
