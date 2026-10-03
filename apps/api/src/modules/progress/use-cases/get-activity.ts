import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { ReviewsRepository } from "@/modules/reviews";
import { SubmissionsRepository } from "@/modules/submissions";

import type { ActivityItem, ActivityView } from "../progress.entity";

export interface GetActivityUseCaseOptions {
  userId: string;
  limit: number;
}

type Options = GetActivityUseCaseOptions;
type Result = ActivityView;

export class GetActivityUseCase extends UseCase<Options, Result> {
  private readonly reviews = makeRepository(ReviewsRepository);

  private readonly submissions = makeRepository(SubmissionsRepository);

  public async execute({ userId, limit }: Options): Promise<Result> {
    const [interviews, submissions, totals] = await Promise.all([
      this.reviews.listForUser(userId, limit),
      this.submissions.listRecentForUser(userId, limit),
      this.reviews.totalsFor(userId),
    ]);
    const items: ActivityItem[] = [
      ...interviews.map((review) => ({
        kind: "interview" as const,
        id: review.interviewId,
        problem: review.problem,
        score: review.score,
        counted: true,
        reviewStatus: null,
        at: review.at,
      })),
      ...submissions.map((submission) => ({
        kind: "challenge" as const,
        id: submission.submissionId,
        problem: submission.problem,
        score: submission.score,
        counted: submission.counted,
        reviewStatus: submission.reviewStatus,
        at: submission.at,
      })),
    ];

    return {
      items: items
        .sort((a, b) => b.at.getTime() - a.at.getTime())
        .slice(0, limit),
      totals: {
        interviewsReviewed: totals.reviewed,
        averageInterviewScore: totals.averageScore,
      },
    };
  }
}
