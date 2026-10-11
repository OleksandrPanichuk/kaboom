import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { ProblemsRepository } from "@/modules/problems";
import { hasRole, UsersService } from "@/modules/users";

import { ReviewNotFoundError } from "../authoring.errors";
import type { ReviewView } from "../draft.entity";
import { ProblemDraftsRepository, ProblemReviewsRepository } from "../ports";

export interface GetReviewUseCaseOptions {
  viewerId: string;
  reviewId: string;
}

type Options = GetReviewUseCaseOptions;
type Result = ReviewView;

export class GetReviewUseCase extends UseCase<Options, Result> {
  private readonly reviews = makeRepository(ProblemReviewsRepository);

  private readonly drafts = makeRepository(ProblemDraftsRepository);

  private readonly problems = makeRepository(ProblemsRepository);

  private readonly users = makeService(UsersService);

  public async execute({ viewerId, reviewId }: Options): Promise<Result> {
    const listing = await this.reviews.findListing(reviewId);
    const viewer = await this.users.getById(viewerId);

    if (
      !listing ||
      (listing.review.authorId !== viewerId &&
        !hasRole(viewer.role, "moderator"))
    ) {
      throw new ReviewNotFoundError(`No review ${reviewId}`);
    }

    const draft = await this.drafts.findById(listing.review.draftId);
    const current =
      draft?.problemId && listing.review.status === "pending"
        ? await this.problems.findById(draft.problemId)
        : null;

    return { ...listing, currentContent: current?.version.content ?? null };
  }
}
