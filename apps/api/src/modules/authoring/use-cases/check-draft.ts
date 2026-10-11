import type { PublishCheck } from "@repo/scoring";

import { make, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { DesignTester } from "@/platform/design-testing";

import { AuthoringService } from "../authoring.service";

export interface CheckDraftUseCaseOptions {
  authorId: string;
  draftId: string;
}

type Options = CheckDraftUseCaseOptions;
type Result = PublishCheck;

export class CheckDraftUseCase extends UseCase<Options, Result> {
  private readonly authoring = makeService(AuthoringService);

  private readonly tester = make(DesignTester);

  public async execute({ authorId, draftId }: Options): Promise<Result> {
    const draft = await this.authoring.ownDraft(authorId, draftId);

    return this.tester.check(await this.authoring.resolve(draft));
  }
}
