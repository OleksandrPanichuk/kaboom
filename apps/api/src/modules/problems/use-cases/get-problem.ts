import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { ProblemsRepository } from "../ports";
import type { ProblemWithContent } from "../problem.entity";
import { ProblemsService } from "../problems.service";

export interface GetProblemUseCaseOptions {
  slug: string;
  version?: number;
}

type Options = GetProblemUseCaseOptions;
type Result = ProblemWithContent;

export class GetProblemUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(ProblemsService);

  private readonly problems = makeRepository(ProblemsRepository);

  public async execute({ slug, version }: Options): Promise<Result> {
    const found =
      version === undefined
        ? await this.service.getPublished(slug)
        : await this.service.getPublishedAt(slug, version);
    const ids = [found.problem.id];
    const [credits, feedback] = await Promise.all([
      this.problems.credits(ids),
      this.problems.feedback(ids),
    ]);

    return {
      ...found,
      problem: {
        ...found.problem,
        credit: credits.get(found.problem.id),
        feedback: feedback.get(found.problem.id),
      },
    };
  }
}
