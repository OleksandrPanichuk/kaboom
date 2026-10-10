import { make, makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { transaction } from "@/db/executor";
import { CreateDesignUseCase } from "@/modules/designs";
import { ProblemsService } from "@/modules/problems";

import { ProblemAttemptsRepository } from "../ports";
import type { AttemptView } from "../submission.entity";
import { SubmissionsService } from "../submissions.service";

export interface StartProblemUseCaseOptions {
  userId: string;
  slug: string;
}

type Options = StartProblemUseCaseOptions;
type Result = AttemptView;

export class StartProblemUseCase extends UseCase<Options, Result> {
  private readonly problems = makeService(ProblemsService);

  private readonly attempts = makeRepository(ProblemAttemptsRepository);

  private readonly service = makeService(SubmissionsService);

  public async execute({ userId, slug }: Options): Promise<Result> {
    const { problem, version } = await this.problems.getPublished(slug);
    const existing = await this.attempts.find(userId, problem.id);

    if (existing) return this.service.view(existing, problem.currentVersion);

    const attempt = await transaction(async () => {
      const design = await make(CreateDesignUseCase).execute({
        ownerId: userId,
        name: problem.title,
        baseline: version.content.baseline,
      });

      return this.attempts.insert({
        userId,
        problemId: problem.id,
        problemVersion: version.version,
        designId: design.id,
      });
    });

    return this.service.view(attempt, problem.currentVersion);
  }
}
