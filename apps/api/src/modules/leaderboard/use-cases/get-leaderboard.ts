import type { Track } from "@repo/design";

import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import {
  LEADERBOARD_SIZE,
  type LeaderboardPeriod,
  WEEK_MS,
} from "../leaderboard.constants";
import { LeaderboardEntity, type LeaderboardView } from "../leaderboard.entity";
import { LeaderboardRepository } from "../ports";

export interface GetLeaderboardUseCaseOptions {
  userId: string;
  period: LeaderboardPeriod;
  track: Track | null;
}

type Options = GetLeaderboardUseCaseOptions;
type Result = LeaderboardView;

export class GetLeaderboardUseCase extends UseCase<Options, Result> {
  private readonly repository = makeRepository(LeaderboardRepository);

  public async execute({ userId, period, track }: Options): Promise<Result> {
    const [standings, profile] = await Promise.all([
      this.repository.standings({
        period,
        track,
        since: period === "week" ? new Date(Date.now() - WEEK_MS) : null,
      }),
      this.repository.findProfile(userId),
    ]);
    const listed = LeaderboardEntity.listed(standings);

    return {
      period,
      track,
      entries: listed.slice(0, LEADERBOARD_SIZE),
      me: { ...LeaderboardEntity.standingOf(standings, userId), profile },
    };
  }
}
