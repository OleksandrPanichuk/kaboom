import { TRACKS } from "@repo/design";
import { t } from "elysia";

import { LEADERBOARD_PERIODS } from "../leaderboard.constants";

export const LeaderboardQuery = t.Object({
  period: t.Optional(
    t.Union(LEADERBOARD_PERIODS.map((value) => t.Literal(value))),
  ),
  track: t.Optional(t.Union(TRACKS.map((value) => t.Literal(value)))),
});
export type LeaderboardQuery = typeof LeaderboardQuery.static;
