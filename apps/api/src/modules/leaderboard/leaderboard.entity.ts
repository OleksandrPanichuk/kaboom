import type { Track } from "@repo/design";

import { avatarUrl } from "@/modules/profiles/profile.avatar";

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
  displayName: string | null;
  avatarKey: string | null;
  visible: boolean;
  points: number;
  solved: number;
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

export interface LeaderboardView {
  period: LeaderboardPeriod;
  track: Track | null;
  entries: ListedStanding[];
  me: UserStanding & { profile: LeaderboardProfileEntity | null };
}

export class LeaderboardEntity {
  public static listed(standings: readonly Standing[]): ListedStanding[] {
    let position = 0;
    let previous: number | null = null;

    return standings
      .filter(
        (
          standing,
        ): standing is Standing & { handle: string; displayName: string } =>
          standing.visible &&
          standing.handle !== null &&
          standing.displayName !== null,
      )
      .map((standing, index) => {
        if (standing.points !== previous) {
          position = index + 1;
          previous = standing.points;
        }

        return {
          userId: standing.userId,
          position,
          handle: standing.handle,
          displayName: standing.displayName,
          avatarKey: standing.avatarKey,
          points: standing.points,
          solved: standing.solved,
        };
      });
  }

  public static standingOf(
    standings: readonly Standing[],
    userId: string,
  ): UserStanding {
    const mine = standings.find((standing) => standing.userId === userId);
    const listed = LeaderboardEntity.listed(standings).find(
      (standing) => standing.userId === userId,
    );

    return {
      points: mine?.points ?? 0,
      solved: mine?.solved ?? 0,
      position: listed?.position ?? null,
    };
  }

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
