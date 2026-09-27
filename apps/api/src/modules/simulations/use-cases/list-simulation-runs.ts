import type { Page, PageRequest } from "@/core/pagination";
import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { DesignsService } from "@/modules/designs";

import { SimulationRunsRepository } from "../ports";
import type { SimulationRunEntity } from "../simulation-run.entity";

export interface ListSimulationRunsUseCaseOptions {
  ownerId: string;
  designId: string;
  page: PageRequest;
}

type Options = ListSimulationRunsUseCaseOptions;
type Result = Page<SimulationRunEntity>;

export class ListSimulationRunsUseCase extends UseCase<Options, Result> {
  private readonly designs = makeService(DesignsService);

  private readonly runs = makeRepository(SimulationRunsRepository);

  public async execute({ ownerId, designId, page }: Options): Promise<Result> {
    await this.designs.assertOwned(designId, ownerId);

    return this.runs.list(designId, page);
  }
}
