import type { Track } from "@repo/design";

import { avatarUrl } from "@/modules/profiles/profile.avatar";

import type { WeeklyChallengeModel } from "./weekly-challenge.model";

export interface FeaturedProblem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  track: Track;
  difficulty: "easy" | "medium" | "hard";
}

export interface FeaturedWeek {
  weekStart: string;
  problemId: string;
  track: Track;
}

export interface WeeklyStanding {
  userId: string;
  position: number;
  handle: string;
  displayName: string;
  avatarKey: string | null;
  score: number;
}

export interface WeeklyStandings {
  participants: number;
  entries: WeeklyStanding[];
}

export interface WeeklyMine {
  score: number | null;
  attempts: number;
  position: number | null;
}

export interface WeeklyChallengeView {
  weekStart: string;
  endsAt: Date;
  problem: FeaturedProblem;
  standings: WeeklyStandings;
  mine: WeeklyMine;
}

export class WeeklyChallengeEntity {
  public static normalize(
    view: WeeklyChallengeView,
    userId: string,
  ): WeeklyChallengeModel {
    const { slug, title, summary, track, difficulty } = view.problem;

    return {
      weekStart: view.weekStart,
      endsAt: view.endsAt.toISOString(),
      problem: { slug, title, summary, track, difficulty },
      participants: view.standings.participants,
      entries: view.standings.entries.map((entry) => ({
        position: entry.position,
        handle: entry.handle,
        displayName: entry.displayName,
        avatarUrl: avatarUrl(entry.avatarKey),
        score: entry.score,
        mine: entry.userId === userId,
      })),
      me: view.mine,
    };
  }
}
