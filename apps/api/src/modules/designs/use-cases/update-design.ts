import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { DesignEntity } from "../design.entity";
import { DesignNotFoundError } from "../designs.errors";
import { DesignsRepository } from "../ports";

export interface UpdateDesignUseCaseOptions {
  ownerId: string;
  id: string;
  name?: string;
}

type Options = UpdateDesignUseCaseOptions;
type Result = DesignEntity;

export class UpdateDesignUseCase extends UseCase<Options, Result> {
  private readonly repository = makeRepository(DesignsRepository);

  public async execute({ ownerId, id, name }: Options): Promise<Result> {
    const updated = await this.repository.updateOwned(id, ownerId, {
      ...(name === undefined ? {} : { name }),
    });

    if (!updated) {
      throw new DesignNotFoundError("Design not found");
    }

    return updated;
  }
}
