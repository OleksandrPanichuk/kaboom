import { hintPenalty, revealedHints } from "@repo/design";

import { makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { DesignsService } from "@/modules/designs";
import { ProblemsService } from "@/modules/problems";

import { ProblemAttemptsRepository, SolutionRevealsRepository } from "./ports";
import type { AttemptEntity, AttemptView } from "./submission.entity";
import { SOLUTION_LOCK_MS } from "./submissions.constants";
import { ProblemNotStartedError } from "./submissions.errors";
import type { AttemptContext } from "./use-cases/attempt-context";

export class SubmissionsService extends Service {
  private readonly problems = makeService(ProblemsService);

  private readonly designs = makeService(DesignsService);

  private readonly attempts = makeRepository(ProblemAttemptsRepository);

  private readonly reveals = makeRepository(SolutionRevealsRepository);

  public lockedUntil(revealedAt: Date | null, now = new Date()): Date | null {
    if (!revealedAt) return null;

    const until = new Date(revealedAt.getTime() + SOLUTION_LOCK_MS);

    return until > now ? until : null;
  }

  public async lockOf(userId: string, problemId: string): Promise<Date | null> {
    const reveal = await this.reveals.find(userId, problemId);

    return this.lockedUntil(reveal?.revealedAt ?? null);
  }

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
    const [version, lockedUntil] = await Promise.all([
      this.problems.getVersion(attempt.problemId, attempt.problemVersion),
      this.lockOf(attempt.userId, attempt.problemId),
    ]);

    return {
      attempt,
      lockedUntil,
      hints: revealedHints(version.content, attempt.hintsRevealed),
      hintPenalty: hintPenalty(version.content, attempt.hintsRevealed),
    };
  }
}
