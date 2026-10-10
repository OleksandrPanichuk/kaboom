import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

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

  public execute({ slug, version }: Options): Promise<Result> {
    return version === undefined
      ? this.service.getPublished(slug)
      : this.service.getPublishedAt(slug, version);
  }
}
