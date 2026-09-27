import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { DesignsService } from "@/modules/designs";

import { SimulationRunsRepository } from "../ports";
import type { SimulationRunEntity } from "../simulation-run.entity";
import { SimulationRunNotFoundError } from "../simulations.errors";

export interface GetSimulationRunUseCaseOptions {
  ownerId: string;
  designId: string;
  id: string;
}

type Options = GetSimulationRunUseCaseOptions;
type Result = SimulationRunEntity;

export class GetSimulationRunUseCase extends UseCase<Options, Result> {
  private readonly designs = makeService(DesignsService);

  private readonly runs = makeRepository(SimulationRunsRepository);

  public async execute({ ownerId, designId, id }: Options): Promise<Result> {
    await this.designs.assertOwned(designId, ownerId);

    const run = await this.runs.findById(designId, id);

    if (!run) throw new SimulationRunNotFoundError("Simulation run not found");

    return run;
  }
}
