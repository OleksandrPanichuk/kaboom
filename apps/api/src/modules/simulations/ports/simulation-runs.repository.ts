import type { Finding, LoadScenario } from "@repo/design";

import type { Page, PageRequest } from "@/core/pagination";
import { Repository } from "@/core/repository";

import type {
  SimulationRunEntity,
  SimulationSummary,
} from "../simulation-run.entity";

export interface CreateSimulationRunData {
  designId: string;
  revision: number;
  graphHash: string;
  scenario: LoadScenario;
  findings: Finding[];
  summary: SimulationSummary;
}

export abstract class SimulationRunsRepository extends Repository {
  public abstract insert(
    data: CreateSimulationRunData,
  ): Promise<SimulationRunEntity>;

  public abstract list(
    designId: string,
    page: PageRequest,
  ): Promise<Page<SimulationRunEntity>>;

  public abstract findById(
    designId: string,
    id: string,
  ): Promise<SimulationRunEntity | null>;
}
