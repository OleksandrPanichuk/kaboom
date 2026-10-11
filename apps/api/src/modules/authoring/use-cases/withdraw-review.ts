import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { ReviewNotFoundError } from "../authoring.errors";
import { AuthoringService } from "../authoring.service";
import type { DraftView } from "../draft.entity";
import { ProblemReviewsRepository } from "../ports";

export interface WithdrawReviewUseCaseOptions {
  authorId: string;
  draftId: string;
}

type Options = WithdrawReviewUseCaseOptions;
type Result = DraftView;

export class WithdrawReviewUseCase extends UseCase<Options, Result> {
  private readonly authoring = makeService(AuthoringService);

  private readonly reviews = makeRepository(ProblemReviewsRepository);

  public async execute({ authorId, draftId }: Options): Promise<Result> {
    const draft = await this.authoring.ownDraft(authorId, draftId);
    const pending = (await this.reviews.listForDraft(draftId)).find(
      (review) => review.status === "pending",
    );

    if (!pending) {
      throw new ReviewNotFoundError("This draft is not waiting for a review");
    }

    await this.reviews.decide(pending.id, {
      status: "withdrawn",
      reviewerId: null,
      feedback: null,
    });

    return this.authoring.view(draft);
  }
}
