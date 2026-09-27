import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { ProblemsService } from "@/modules/problems";

import { ProblemAttemptsRepository } from "../ports";
import type { AttemptView } from "../submission.entity";
import { ProblemNotStartedError } from "../submissions.errors";
import { SubmissionsService } from "../submissions.service";

export interface GetAttemptUseCaseOptions {
  userId: string;
  slug: string;
}

type Options = GetAttemptUseCaseOptions;
type Result = AttemptView;

export class GetAttemptUseCase extends UseCase<Options, Result> {
  private readonly problems = makeService(ProblemsService);

  private readonly attempts = makeRepository(ProblemAttemptsRepository);

  private readonly service = makeService(SubmissionsService);

  public async execute({ userId, slug }: Options): Promise<Result> {
    const { problem } = await this.problems.getPublished(slug);
    const attempt = await this.attempts.find(userId, problem.id);

    if (!attempt)
      throw new ProblemNotStartedError("The problem is not started");

    return this.service.view(attempt);
  }
}
