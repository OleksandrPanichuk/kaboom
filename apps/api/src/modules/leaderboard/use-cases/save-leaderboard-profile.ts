import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { LeaderboardProfileEntity } from "../leaderboard.entity";
import { HandleTakenError } from "../leaderboard.errors";
import { LeaderboardRepository } from "../ports";

export interface SaveLeaderboardProfileUseCaseOptions {
  userId: string;
  handle: string;
  visible: boolean;
}

type Options = SaveLeaderboardProfileUseCaseOptions;
type Result = LeaderboardProfileEntity;

export class SaveLeaderboardProfileUseCase extends UseCase<Options, Result> {
  private readonly repository = makeRepository(LeaderboardRepository);

  public async execute({ userId, handle, visible }: Options): Promise<Result> {
    const saved = await this.repository.saveProfile({
      userId,
      handle: handle.toLowerCase(),
      visible,
    });

    if (!saved) throw new HandleTakenError("That handle is taken");

    return saved;
  }
}
