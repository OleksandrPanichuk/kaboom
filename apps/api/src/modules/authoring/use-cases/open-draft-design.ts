import { make, makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { CreateDesignUseCase, DesignsRepository } from "@/modules/designs";

import { AuthoringService } from "../authoring.service";
import { type DraftDesignPart, ProblemDraftsRepository } from "../ports";

export interface OpenDraftDesignUseCaseOptions {
  authorId: string;
  draftId: string;
  part: DraftDesignPart;
}

type Options = OpenDraftDesignUseCaseOptions;
interface Result {
  designId: string;
}

const titleOf = (content: unknown): string => {
  const title =
    content !== null && typeof content === "object"
      ? (content as Record<string, unknown>).title
      : undefined;

  return typeof title === "string" && title.trim() !== ""
    ? title.trim().slice(0, 80)
    : "Untitled problem";
};

export class OpenDraftDesignUseCase extends UseCase<Options, Result> {
  private readonly authoring = makeService(AuthoringService);

  private readonly drafts = makeRepository(ProblemDraftsRepository);

  private readonly designs = makeRepository(DesignsRepository);

  public async execute({ authorId, draftId, part }: Options): Promise<Result> {
    const draft = await this.authoring.ownDraft(authorId, draftId);
    const linked =
      part === "baseline" ? draft.baselineDesignId : draft.referenceDesignId;

    if (linked && (await this.designs.existsOwned(linked, authorId))) {
      return { designId: linked };
    }

    const design = await make(CreateDesignUseCase).execute({
      ownerId: authorId,
      name: `${titleOf(draft.content)} · ${part}`,
      baseline: this.authoring.graphOf(draft.content, part),
    });

    await this.drafts.linkDesign(draftId, part, design.id);

    return { designId: design.id };
  }
}
