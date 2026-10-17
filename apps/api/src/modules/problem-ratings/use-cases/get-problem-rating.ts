import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { ProblemsService } from "@/modules/problems";

import type { ProblemRatingEntity } from "../problem-rating.entity";
import { ProblemRatingsService } from "../problem-ratings.service";

export interface GetProblemRatingUseCaseOptions {
  userId: string;
  slug: string;
}

type Options = GetProblemRatingUseCaseOptions;
type Result = ProblemRatingEntity;

export class GetProblemRatingUseCase extends UseCase<Options, Result> {
  private readonly problems = makeService(ProblemsService);

  private readonly service = makeService(ProblemRatingsService);

  public async execute({ userId, slug }: Options): Promise<Result> {
    const { problem } = await this.problems.getPublished(slug);

    return this.service.view(problem, userId);
  }
}
