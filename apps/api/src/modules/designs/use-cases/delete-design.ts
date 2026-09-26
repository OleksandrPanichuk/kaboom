import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { DesignNotFoundError } from "../designs.errors";
import { DesignsRepository } from "../ports";

export interface DeleteDesignUseCaseOptions {
  ownerId: string;
  id: string;
}

type Options = DeleteDesignUseCaseOptions;
type Result = void;

export class DeleteDesignUseCase extends UseCase<Options, Result> {
  private readonly repository = makeRepository(DesignsRepository);

  public async execute({ ownerId, id }: Options): Promise<Result> {
    const deleted = await this.repository.deleteOwned(id, ownerId);

    if (!deleted) {
      throw new DesignNotFoundError("Design not found");
    }
  }
}
