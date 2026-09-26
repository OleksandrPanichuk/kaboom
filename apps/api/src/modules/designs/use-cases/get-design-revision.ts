import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { replayRevisions } from "../design.replay";
import type { DesignRevisionGraph } from "../design-revision.entity";
import { DesignRevisionNotFoundError } from "../designs.errors";
import { DesignsService } from "../designs.service";
import { DesignRevisionsRepository } from "../ports";

export interface GetDesignRevisionUseCaseOptions {
  ownerId: string;
  id: string;
  number: number;
}

type Options = GetDesignRevisionUseCaseOptions;
type Result = DesignRevisionGraph;

export class GetDesignRevisionUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(DesignsService);

  private readonly revisions = makeRepository(DesignRevisionsRepository);

  public async execute({ ownerId, id, number }: Options): Promise<Result> {
    await this.service.assertOwned(id, ownerId);

    const revisions = await this.revisions.listThrough(id, number);
    const revision = revisions.at(-1);

    if (revision?.number !== number) {
      throw new DesignRevisionNotFoundError("Revision not found");
    }

    return { revision, graph: replayRevisions(revisions) };
  }
}
