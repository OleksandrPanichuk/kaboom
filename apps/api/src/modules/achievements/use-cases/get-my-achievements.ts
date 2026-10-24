import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { AchievementsView } from "../achievements.entity";
import { AchievementsService } from "../achievements.service";

export interface GetMyAchievementsUseCaseOptions {
  userId: string;
}

type Options = GetMyAchievementsUseCaseOptions;
type Result = AchievementsView;

export class GetMyAchievementsUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(AchievementsService);

  public execute({ userId }: Options): Promise<Result> {
    return this.service.of(userId);
  }
}
