import { TRACKS } from "@repo/design";
import { t } from "elysia";

import { LEADERBOARD_PERIODS } from "./leaderboard.constants";

export const LeaderboardEntryModel = t.Object({
  position: t.Integer(),
  handle: t.String(),
  points: t.Integer(),
  solved: t.Integer(),
  rank: t.Nullable(t.String()),
});
export type LeaderboardEntryModel = typeof LeaderboardEntryModel.static;

export const LeaderboardModel = t.Object({
  period: t.UnionEnum(LEADERBOARD_PERIODS),
  track: t.Nullable(t.UnionEnum(TRACKS)),
  entries: t.Array(LeaderboardEntryModel),
  me: t.Object({
    handle: t.Nullable(t.String()),
    visible: t.Boolean(),
    points: t.Integer(),
    solved: t.Integer(),
    position: t.Nullable(t.Integer()),
  }),
});
export type LeaderboardModel = typeof LeaderboardModel.static;

export const LeaderboardProfileModel = t.Object({
  handle: t.String(),
  visible: t.Boolean(),
});
export type LeaderboardProfileModel = typeof LeaderboardProfileModel.static;
