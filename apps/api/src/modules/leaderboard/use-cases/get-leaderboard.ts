import type { Track } from "@repo/design";

import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import {
  LEADERBOARD_SIZE,
  type LeaderboardPeriod,
  WEEK_MS,
} from "../leaderboard.constants";
import type { LeaderboardFilter, LeaderboardView } from "../leaderboard.entity";
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
    const filter: LeaderboardFilter = {
      period,
      track,
      since: period === "week" ? new Date(Date.now() - WEEK_MS) : null,
    };
    const [entries, standing, profile] = await Promise.all([
      this.repository.board(filter, LEADERBOARD_SIZE),
      this.repository.standingOf(userId, filter),
      this.repository.findProfile(userId),
    ]);

    return { period, track, entries, me: { ...standing, profile } };
  }
}
