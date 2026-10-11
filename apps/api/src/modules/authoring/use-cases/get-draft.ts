import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { AuthoringService } from "../authoring.service";
import type { DraftView } from "../draft.entity";

export interface GetDraftUseCaseOptions {
  authorId: string;
  draftId: string;
}

type Options = GetDraftUseCaseOptions;
type Result = DraftView;

export class GetDraftUseCase extends UseCase<Options, Result> {
  private readonly authoring = makeService(AuthoringService);

  public async execute({ authorId, draftId }: Options): Promise<Result> {
    return this.authoring.view(
      await this.authoring.ownDraft(authorId, draftId),
    );
  }
}
