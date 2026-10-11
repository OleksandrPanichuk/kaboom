import { parseProblem } from "@repo/scoring";

import { makeRepository } from "@/core/registry";
import { Service } from "@/core/service";
import { ProblemsRepository } from "@/modules/problems";

import { MAX_DRAFT_BYTES } from "./authoring.constants";
import { DraftNotFoundError, DraftTooLargeError } from "./authoring.errors";
import type { DraftEntity, DraftView } from "./draft.entity";
import { ProblemDraftsRepository, ProblemReviewsRepository } from "./ports";

export class AuthoringService extends Service {
  private readonly drafts = makeRepository(ProblemDraftsRepository);

  private readonly reviews = makeRepository(ProblemReviewsRepository);

  private readonly problems = makeRepository(ProblemsRepository);

  public async ownDraft(
    authorId: string,
    draftId: string,
  ): Promise<DraftEntity> {
    const draft = await this.drafts.findById(draftId);

    if (draft?.authorId !== authorId) {
      throw new DraftNotFoundError(`No draft ${draftId}`);
    }

    return draft;
  }

  public assertSize(content: unknown): void {
    const bytes = new TextEncoder().encode(JSON.stringify(content)).length;

    if (bytes > MAX_DRAFT_BYTES) {
      throw new DraftTooLargeError(
        `A problem may be at most ${MAX_DRAFT_BYTES / 1024} KB; this one is ${Math.ceil(bytes / 1024)} KB`,
      );
    }
  }

  public async view(draft: DraftEntity): Promise<DraftView> {
    const [reviews, linked, forked] = await Promise.all([
      this.reviews.listForDraft(draft.id),
      draft.problemId ? this.problems.findById(draft.problemId) : null,
      draft.forkedFromId ? this.problems.findById(draft.forkedFromId) : null,
    ]);
    const parsed = parseProblem(draft.content);

    return {
      draft,
      reviews,
      problem: linked
        ? {
            slug: linked.problem.slug,
            title: linked.problem.title,
            currentVersion: linked.problem.currentVersion,
          }
        : null,
      forkedFrom: forked
        ? { slug: forked.problem.slug, title: forked.problem.title }
        : null,
      issues: parsed.ok ? [] : parsed.issues,
    };
  }
}
