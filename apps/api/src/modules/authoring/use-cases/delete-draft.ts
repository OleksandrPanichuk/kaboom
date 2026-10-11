import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { AuthoringService } from "../authoring.service";
import { ProblemDraftsRepository } from "../ports";

export interface DeleteDraftUseCaseOptions {
  authorId: string;
  draftId: string;
}

type Options = DeleteDraftUseCaseOptions;
type Result = void;

export class DeleteDraftUseCase extends UseCase<Options, Result> {
  private readonly drafts = makeRepository(ProblemDraftsRepository);

  private readonly authoring = makeService(AuthoringService);

  public async execute({ authorId, draftId }: Options): Promise<Result> {
    await this.authoring.ownDraft(authorId, draftId);
    await this.drafts.delete(draftId);
  }
}
