import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { ProblemWithContent } from "../problem.entity";
import { ProblemsService } from "../problems.service";

export interface GetProblemUseCaseOptions {
  slug: string;
}

type Options = GetProblemUseCaseOptions;
type Result = ProblemWithContent;

export class GetProblemUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(ProblemsService);

  public execute({ slug }: Options): Promise<Result> {
    return this.service.getPublished(slug);
  }
}
