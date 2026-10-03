import type { Track } from "@repo/design";

import type { LeaderboardPeriod } from "./leaderboard.constants";
import type { LeaderboardModel } from "./leaderboard.model";

export interface LeaderboardProfileEntity {
  userId: string;
  handle: string;
  visible: boolean;
}

export interface Standing {
  userId: string;
  handle: string | null;
  visible: boolean;
  points: number;
  solved: number;
}

export interface ListedStanding {
  position: number;
  handle: string;
  points: number;
  solved: number;
}

export interface LeaderboardFilter {
  period: LeaderboardPeriod;
  track: Track | null;
  since: Date | null;
}

export interface LeaderboardView {
  period: LeaderboardPeriod;
  track: Track | null;
  entries: ListedStanding[];
  me: {
    profile: LeaderboardProfileEntity | null;
    points: number;
    solved: number;
    position: number | null;
  };
}

export class LeaderboardEntity {
  public static normalize(
    view: LeaderboardView,
    rankName: (points: number) => string,
  ): LeaderboardModel {
    return {
      period: view.period,
      track: view.track,
      entries: view.entries.map((entry) => ({
        ...entry,
        rank:
          view.period === "all" && view.track === null
            ? rankName(entry.points)
            : null,
      })),
      me: {
        handle: view.me.profile?.handle ?? null,
        visible: view.me.profile?.visible ?? false,
        points: view.me.points,
        solved: view.me.solved,
        position: view.me.position,
      },
    };
  }
}
