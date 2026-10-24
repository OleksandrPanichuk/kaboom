import type { Page, PageRequest } from "@/core/pagination";
import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import type { DesignKind, DesignOrigin } from "@/db";

import type { DesignSummaryEntity } from "../design.entity";
import { DesignsRepository } from "../ports";

export interface ListDesignsUseCaseOptions {
  ownerId: string;
  page: PageRequest;
  kind?: DesignKind;
  origin?: DesignOrigin;
}

type Options = ListDesignsUseCaseOptions;
type Result = Page<DesignSummaryEntity>;

export class ListDesignsUseCase extends UseCase<Options, Result> {
  private readonly repository = makeRepository(DesignsRepository);

  public execute({ ownerId, page, kind, origin }: Options): Promise<Result> {
    return this.repository.listOwned(ownerId, page, { kind, origin });
  }
}
