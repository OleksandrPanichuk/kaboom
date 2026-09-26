import type { Page, PageRequest } from "@/core/pagination";
import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { DesignRevisionEntity } from "../design-revision.entity";
import { DesignsService } from "../designs.service";
import { DesignRevisionsRepository } from "../ports";

export interface ListDesignRevisionsUseCaseOptions {
  ownerId: string;
  id: string;
  page: PageRequest;
}

type Options = ListDesignRevisionsUseCaseOptions;
type Result = Page<DesignRevisionEntity>;

export class ListDesignRevisionsUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(DesignsService);

  private readonly revisions = makeRepository(DesignRevisionsRepository);

  public async execute({ ownerId, id, page }: Options): Promise<Result> {
    await this.service.assertOwned(id, ownerId);

    return this.revisions.list(id, page);
  }
}
