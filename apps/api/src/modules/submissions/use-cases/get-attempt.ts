import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { ProblemsService } from "@/modules/problems";

import { ProblemAttemptsRepository } from "../ports";
import type { AttemptEntity } from "../submission.entity";
import { ProblemNotStartedError } from "../submissions.errors";

export interface GetAttemptUseCaseOptions {
  userId: string;
  slug: string;
}

type Options = GetAttemptUseCaseOptions;
type Result = AttemptEntity;

export class GetAttemptUseCase extends UseCase<Options, Result> {
  private readonly problems = makeService(ProblemsService);

  private readonly attempts = makeRepository(ProblemAttemptsRepository);

  public async execute({ userId, slug }: Options): Promise<Result> {
    const { problem } = await this.problems.getPublished(slug);
    const attempt = await this.attempts.find(userId, problem.id);

    if (!attempt)
      throw new ProblemNotStartedError("The problem is not started");

    return attempt;
  }
}
