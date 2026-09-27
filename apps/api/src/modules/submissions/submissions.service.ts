import { hintPenalty, revealedHints } from "@repo/design";

import { makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { DesignsService } from "@/modules/designs";
import { ProblemsService } from "@/modules/problems";

import { ProblemAttemptsRepository } from "./ports";
import type { AttemptEntity, AttemptView } from "./submission.entity";
import { ProblemNotStartedError } from "./submissions.errors";
import type { AttemptContext } from "./use-cases/attempt-context";

export class SubmissionsService extends Service {
  private readonly problems = makeService(ProblemsService);

  private readonly designs = makeService(DesignsService);

  private readonly attempts = makeRepository(ProblemAttemptsRepository);

  public async attempt(userId: string, slug: string): Promise<AttemptContext> {
    const found = await this.problems.getPublished(slug);
    const attempt = await this.attempts.find(userId, found.problem.id);

    if (!attempt) {
      throw new ProblemNotStartedError("Start the problem before running it");
    }

    const [version, design] = await Promise.all([
      this.problems.getVersion(found.problem.id, attempt.problemVersion),
      this.designs.getOwned(attempt.designId, userId),
    ]);

    return { found, attempt, version, design };
  }

  public async view(attempt: AttemptEntity): Promise<AttemptView> {
    const version = await this.problems.getVersion(
      attempt.problemId,
      attempt.problemVersion,
    );

    return {
      attempt,
      hints: revealedHints(version.content, attempt.hintsRevealed),
      hintPenalty: hintPenalty(version.content, attempt.hintsRevealed),
    };
  }
}
