import { make, makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { hashProblem, ProblemsRepository } from "@/modules/problems";
import { DesignTester } from "@/platform/design-testing";

import {
  NothingToReviewError,
  ProblemNotPublishableError,
  ReviewPendingError,
  SlugChangedError,
  SlugTakenError,
} from "../authoring.errors";
import { AuthoringService } from "../authoring.service";
import type { DraftView } from "../draft.entity";
import { ProblemReviewsRepository } from "../ports";

export interface SubmitDraftUseCaseOptions {
  authorId: string;
  draftId: string;
}

type Options = SubmitDraftUseCaseOptions;
type Result = DraftView;

export class SubmitDraftUseCase extends UseCase<Options, Result> {
  private readonly authoring = makeService(AuthoringService);

  private readonly reviews = makeRepository(ProblemReviewsRepository);

  private readonly problems = makeRepository(ProblemsRepository);

  private readonly tester = make(DesignTester);

  public async execute({ authorId, draftId }: Options): Promise<Result> {
    const draft = await this.authoring.ownDraft(authorId, draftId);
    const resolved = await this.authoring.resolve(draft);

    this.authoring.assertSize(resolved);

    const check = await this.tester.check(resolved);

    if (!check.ok) {
      throw new ProblemNotPublishableError(
        "The problem is not ready to publish yet",
        { issues: check.issues },
      );
    }

    const { problem: content } = check;
    const contentHash = hashProblem(content);

    if (draft.problemId) {
      const linked = await this.problems.findById(draft.problemId);

      if (linked && linked.problem.slug !== content.slug) {
        throw new SlugChangedError(
          `A published problem keeps its address; set the slug back to ${linked.problem.slug}`,
        );
      }

      if (linked?.version.contentHash === contentHash) {
        throw new NothingToReviewError("This is the version already published");
      }
    } else if (await this.problems.findBySlug(content.slug)) {
      throw new SlugTakenError(`Another problem already uses ${content.slug}`);
    }

    const review = await this.reviews.insertPending({
      draftId,
      authorId,
      slug: content.slug,
      title: content.title,
      track: content.track,
      difficulty: content.difficulty,
      content,
      contentHash,
    });

    if (!review) {
      throw new ReviewPendingError(
        "This draft is already waiting for a review; withdraw it to send a newer one",
      );
    }

    return this.authoring.view(draft);
  }
}
