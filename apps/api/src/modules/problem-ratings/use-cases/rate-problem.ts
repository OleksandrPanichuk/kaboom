import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { ProblemsService } from "@/modules/problems";

import type { ProblemRatingEntity } from "../problem-rating.entity";
import { ProblemRatingsRepository } from "../problem-ratings.repository";
import { ProblemRatingsService } from "../problem-ratings.service";

export interface RateProblemUseCaseOptions {
  userId: string;
  slug: string;
  stars: number;
}

type Options = RateProblemUseCaseOptions;
type Result = ProblemRatingEntity;

export class RateProblemUseCase extends UseCase<Options, Result> {
  private readonly problems = makeService(ProblemsService);

  private readonly service = makeService(ProblemRatingsService);

  private readonly ratings = makeRepository(ProblemRatingsRepository);

  public async execute({ userId, slug, stars }: Options): Promise<Result> {
    const { problem } = await this.problems.getPublished(slug);

    await this.service.assertMayRate(problem, userId);
    await this.ratings.upsert(problem.id, userId, stars);

    return this.service.view(problem, userId);
  }
}
