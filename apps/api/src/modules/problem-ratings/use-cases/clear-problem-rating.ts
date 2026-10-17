import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { ProblemsService } from "@/modules/problems";

import type { ProblemRatingEntity } from "../problem-rating.entity";
import { ProblemRatingsRepository } from "../problem-ratings.repository";
import { ProblemRatingsService } from "../problem-ratings.service";

export interface ClearProblemRatingUseCaseOptions {
  userId: string;
  slug: string;
}

type Options = ClearProblemRatingUseCaseOptions;
type Result = ProblemRatingEntity;

export class ClearProblemRatingUseCase extends UseCase<Options, Result> {
  private readonly problems = makeService(ProblemsService);

  private readonly service = makeService(ProblemRatingsService);

  private readonly ratings = makeRepository(ProblemRatingsRepository);

  public async execute({ userId, slug }: Options): Promise<Result> {
    const { problem } = await this.problems.getPublished(slug);

    await this.ratings.delete(problem.id, userId);

    return this.service.view(problem, userId);
  }
}
