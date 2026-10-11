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
    const credit = (await this.problems.credits([found.problem.id])).get(
      found.problem.id,
    );

    return { ...found, problem: { ...found.problem, credit } };
  }
}
