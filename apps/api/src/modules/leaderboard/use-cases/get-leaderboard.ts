import type { Track } from "@repo/design";

import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import {
  LEADERBOARD_SIZE,
  type LeaderboardPeriod,
  WEEK_MS,
} from "../leaderboard.constants";
import type { LeaderboardView } from "../leaderboard.entity";
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
    const listed = standings.filter(
      (standing): standing is typeof standing & { handle: string } =>
        standing.visible && standing.handle !== null,
    );
    let position = 0;
    let previous: number | null = null;
    const positioned = listed.map((standing, index) => {
      if (standing.points !== previous) {
        position = index + 1;
        previous = standing.points;
      }

      return {
        position,
        handle: standing.handle,
        points: standing.points,
        solved: standing.solved,
      };
    });
    const mine = standings.find((standing) => standing.userId === userId);
    const myIndex = listed.findIndex((standing) => standing.userId === userId);

    return {
      period,
      track,
      entries: positioned.slice(0, LEADERBOARD_SIZE),
      me: {
        profile,
        points: mine?.points ?? 0,
        solved: mine?.solved ?? 0,
        position: myIndex === -1 ? null : positioned[myIndex]!.position,
      },
    };
  }
}
