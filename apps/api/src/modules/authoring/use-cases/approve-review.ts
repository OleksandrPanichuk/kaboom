import { make, makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import type { ProblemDifficulty } from "@/db";
import { transaction } from "@/db/executor";
import { hashProblem, ProblemsRepository } from "@/modules/problems";
import { DesignTester } from "@/platform/design-testing";

import {
  OwnProblemReviewError,
  ProblemNotPublishableError,
  ReviewDecidedError,
  ReviewNotFoundError,
  SlugTakenError,
} from "../authoring.errors";
import type { ReviewListing } from "../draft.entity";
import { ProblemDraftsRepository, ProblemReviewsRepository } from "../ports";

export interface ApproveReviewUseCaseOptions {
  reviewerId: string;
  reviewId: string;
  difficulty: ProblemDifficulty | null;
}

type Options = ApproveReviewUseCaseOptions;
type Result = ReviewListing;

export class ApproveReviewUseCase extends UseCase<Options, Result> {
  private readonly reviews = makeRepository(ProblemReviewsRepository);

  private readonly drafts = makeRepository(ProblemDraftsRepository);

  private readonly problems = makeRepository(ProblemsRepository);

  private readonly tester = make(DesignTester);

  public async execute({
    reviewerId,
    reviewId,
    difficulty,
  }: Options): Promise<Result> {
    const review = await this.reviews.findById(reviewId);

    if (!review) throw new ReviewNotFoundError(`No review ${reviewId}`);
    if (review.authorId === reviewerId) {
      throw new OwnProblemReviewError(
        "Another moderator has to review your own problem",
      );
    }
    if (review.status !== "pending") {
      throw new ReviewDecidedError(`This review is already ${review.status}`);
    }

    const check = await this.tester.check({
      ...(review.content as Record<string, unknown>),
      ...(difficulty ? { difficulty } : {}),
    });

    if (!check.ok) {
      throw new ProblemNotPublishableError(
        "The problem no longer passes the publish check; reject it with what to fix",
        { issues: check.issues },
      );
    }

    const { problem: content } = check;
    const contentHash = hashProblem(content);

    return transaction(async () => {
      const draft = await this.drafts.findById(review.draftId);

      if (draft?.problemId) {
        await this.problems.addVersion({
          problemId: draft.problemId,
          content,
          contentHash,
        });
      } else {
        if (await this.problems.findBySlug(content.slug)) {
          throw new SlugTakenError(
            `Another problem took ${content.slug} since this was sent; reject it so the author picks another`,
          );
        }

        const created = await this.problems.publishCommunity({
          authorId: review.authorId,
          forkedFromId: draft?.forkedFromId ?? null,
          content,
          contentHash,
        });

        if (draft) await this.drafts.linkProblem(draft.id, created.id);
      }

      const decided = await this.reviews.decide(reviewId, {
        status: "approved",
        reviewerId,
        feedback: null,
        content,
        difficulty: content.difficulty,
      });

      if (!decided) {
        throw new ReviewDecidedError("Someone decided this review first");
      }

      return (await this.reviews.findListing(reviewId))!;
    });
  }
}
