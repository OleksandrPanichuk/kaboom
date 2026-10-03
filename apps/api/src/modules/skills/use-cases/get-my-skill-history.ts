import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { SkillScoresRepository } from "../ports";
import type { SkillHistoryPoint } from "../skill.entity";

export interface GetMySkillHistoryUseCaseOptions {
  userId: string;
}

type Options = GetMySkillHistoryUseCaseOptions;
type Result = SkillHistoryPoint[];

export class GetMySkillHistoryUseCase extends UseCase<Options, Result> {
  private readonly scores = makeRepository(SkillScoresRepository);

  public execute({ userId }: Options): Promise<Result> {
    return this.scores.historyFor(userId);
  }
}
