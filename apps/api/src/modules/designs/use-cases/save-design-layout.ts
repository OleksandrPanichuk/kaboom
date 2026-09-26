import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { DesignLayout } from "../design.entity";
import { DesignNotFoundError } from "../designs.errors";
import { DesignsRepository } from "../ports";

export interface SaveDesignLayoutUseCaseOptions {
  ownerId: string;
  id: string;
  layout: DesignLayout;
}

type Options = SaveDesignLayoutUseCaseOptions;
type Result = void;

export class SaveDesignLayoutUseCase extends UseCase<Options, Result> {
  private readonly repository = makeRepository(DesignsRepository);

  public async execute({ ownerId, id, layout }: Options): Promise<Result> {
    if (!(await this.repository.saveLayout(id, ownerId, layout))) {
      throw new DesignNotFoundError("Design not found");
    }
  }
}
