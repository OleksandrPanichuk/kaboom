import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { DesignEntity } from "../design.entity";
import { DesignsService } from "../designs.service";

export interface GetDesignUseCaseOptions {
  ownerId: string;
  id: string;
}

type Options = GetDesignUseCaseOptions;
type Result = DesignEntity;

export class GetDesignUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(DesignsService);

  public execute({ ownerId, id }: Options): Promise<Result> {
    return this.service.getOwned(id, ownerId);
  }
}
