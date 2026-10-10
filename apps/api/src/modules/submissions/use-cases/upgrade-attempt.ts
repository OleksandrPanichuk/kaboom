import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { ProblemsService } from "@/modules/problems";

import { ProblemAttemptsRepository } from "../ports";
import type { AttemptView } from "../submission.entity";
import { ProblemNotStartedError } from "../submissions.errors";
import { SubmissionsService } from "../submissions.service";

export interface UpgradeAttemptUseCaseOptions {
  userId: string;
  slug: string;
}

type Options = UpgradeAttemptUseCaseOptions;
type Result = AttemptView;

export class UpgradeAttemptUseCase extends UseCase<Options, Result> {
  private readonly problems = makeService(ProblemsService);

  private readonly attempts = makeRepository(ProblemAttemptsRepository);

  private readonly service = makeService(SubmissionsService);

  public async execute({ userId, slug }: Options): Promise<Result> {
    const { problem, version } = await this.problems.getPublished(slug);
    const attempt = await this.attempts.find(userId, problem.id);

    if (!attempt)
      throw new ProblemNotStartedError("The problem is not started");

    const moved = await this.attempts.moveToVersion(
      attempt.id,
      version.version,
      version.content.hints.length,
    );

    return this.service.view(moved ?? attempt, problem.currentVersion);
  }
}
