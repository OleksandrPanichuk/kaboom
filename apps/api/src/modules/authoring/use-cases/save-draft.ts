import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { AuthoringService } from "../authoring.service";
import type { DraftView } from "../draft.entity";
import { ProblemDraftsRepository } from "../ports";

export interface SaveDraftUseCaseOptions {
  authorId: string;
  draftId: string;
  content: unknown;
}

type Options = SaveDraftUseCaseOptions;
type Result = DraftView;

export class SaveDraftUseCase extends UseCase<Options, Result> {
  private readonly drafts = makeRepository(ProblemDraftsRepository);

  private readonly authoring = makeService(AuthoringService);

  public async execute({
    authorId,
    draftId,
    content,
  }: Options): Promise<Result> {
    const draft = await this.authoring.ownDraft(authorId, draftId);
    const resolved = await this.authoring.resolve(draft, content);

    this.authoring.assertSize(resolved);

    return this.authoring.view(
      await this.drafts.updateContent(draftId, resolved),
    );
  }
}
