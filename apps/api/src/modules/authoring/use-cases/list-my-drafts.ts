import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { ProblemsRepository } from "@/modules/problems";

import type { DraftEntity, ReviewEntity } from "../draft.entity";
import { ProblemDraftsRepository, ProblemReviewsRepository } from "../ports";

export interface ListMyDraftsUseCaseOptions {
  authorId: string;
}

type Options = ListMyDraftsUseCaseOptions;
type Result = Array<{
  draft: DraftEntity;
  reviews: ReviewEntity[];
  problemSlug: string | null;
}>;

export class ListMyDraftsUseCase extends UseCase<Options, Result> {
  private readonly drafts = makeRepository(ProblemDraftsRepository);

  private readonly reviews = makeRepository(ProblemReviewsRepository);

  private readonly problems = makeRepository(ProblemsRepository);

  public async execute({ authorId }: Options): Promise<Result> {
    const drafts = await this.drafts.listForAuthor(authorId);
    const reviews = await this.reviews.listForDrafts(
      drafts.map((draft) => draft.id),
    );
    const linked = await Promise.all(
      drafts.map((draft) =>
        draft.problemId
          ? this.problems.findById(draft.problemId)
          : Promise.resolve(null),
      ),
    );

    return drafts.map((draft, index) => ({
      draft,
      reviews: reviews.filter((review) => review.draftId === draft.id),
      problemSlug: linked[index]?.problem.slug ?? null,
    }));
  }
}
