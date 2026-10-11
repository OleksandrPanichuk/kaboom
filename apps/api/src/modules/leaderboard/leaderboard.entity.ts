import type { Track } from "@repo/design";

import { avatarUrl } from "@/modules/profiles/profile.avatar";

import type { LeaderboardPeriod } from "./leaderboard.constants";
import type { LeaderboardModel } from "./leaderboard.model";

export interface LeaderboardProfileEntity {
  userId: string;
  handle: string;
  visible: boolean;
}

export interface ListedStanding {
  userId: string;
  position: number;
  handle: string;
  displayName: string;
  avatarKey: string | null;
  points: number;
  solved: number;
}

export interface LeaderboardFilter {
  period: LeaderboardPeriod;
  track: Track | null;
  since: Date | null;
}

export interface UserStanding {
  points: number;
  solved: number;
  position: number | null;
}

export interface OfficialRule {
  id: string;
  difficulty: string;
  track: string;
}

export interface LeaderboardView {
  period: LeaderboardPeriod;
  track: Track | null;
  entries: ListedStanding[];
  me: UserStanding & { profile: LeaderboardProfileEntity | null };
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
        position: entry.position,
        handle: entry.handle,
        displayName: entry.displayName,
        avatarUrl: avatarUrl(entry.avatarKey),
        points: entry.points,
        solved: entry.solved,
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
