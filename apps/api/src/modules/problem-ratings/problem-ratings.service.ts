import { makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import type { ProblemEntity } from "@/modules/problems";
import { SubmissionsService } from "@/modules/submissions";

import type {
  ProblemRatingEntity,
  RatingEligibility,
} from "./problem-rating.entity";
import {
  RatingNeedsSubmissionError,
  RatingOwnProblemError,
} from "./problem-ratings.errors";
import { ProblemRatingsRepository } from "./problem-ratings.repository";

export class ProblemRatingsService extends Service {
  private readonly submissions = makeService(SubmissionsService);

  private readonly ratings = makeRepository(ProblemRatingsRepository);

  public async view(
    problem: ProblemEntity,
    userId: string,
  ): Promise<ProblemRatingEntity> {
    const [tally, eligibility] = await Promise.all([
      this.ratings.tally(problem.id, userId),
      this.eligibility(problem, userId),
    ]);

    return { ...tally, eligibility };
  }

  public async assertMayRate(
    problem: ProblemEntity,
    userId: string,
  ): Promise<void> {
    const eligibility = await this.eligibility(problem, userId);

    if (eligibility === "own-problem") {
      throw new RatingOwnProblemError("Authors do not rate their own problems");
    }

    if (eligibility === "needs-submission") {
      throw new RatingNeedsSubmissionError(
        "Submit a solution to this problem before rating it",
      );
    }
  }

  private async eligibility(
    problem: ProblemEntity,
    userId: string,
  ): Promise<RatingEligibility> {
    if (problem.authorId === userId) return "own-problem";

    return (await this.submissions.hasSubmitted(userId, problem.id))
      ? "eligible"
      : "needs-submission";
  }
}
