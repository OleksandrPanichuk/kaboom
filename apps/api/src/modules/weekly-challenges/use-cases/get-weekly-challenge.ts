import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { WeeklyChallengeView } from "../weekly-challenge.entity";
import { WeeklyChallengesService } from "../weekly-challenges.service";

export interface GetWeeklyChallengeUseCaseOptions {
  userId: string;
}

type Options = GetWeeklyChallengeUseCaseOptions;
type Result = WeeklyChallengeView | null;

export class GetWeeklyChallengeUseCase extends UseCase<Options, Result> {
  private readonly challenges = makeService(WeeklyChallengesService);

  public execute({ userId }: Options): Promise<Result> {
    return this.challenges.current(userId);
  }
}
