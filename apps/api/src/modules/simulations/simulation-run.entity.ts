import type { Finding, LoadScenario } from "@repo/design";

import type {
  SimulationRunModel,
  SimulationSummaryModel,
} from "./simulation-run.model";

export type SimulationSummary = SimulationSummaryModel;

export interface SimulationRunEntity {
  id: string;
  designId: string;
  revision: number;
  graphHash: string;
  scenario: LoadScenario;
  findings: Finding[];
  summary: SimulationSummary;
  createdAt: Date;
}

export class SimulationRunEntity {
  public static normalize(entity: SimulationRunEntity): SimulationRunModel {
    return {
      id: entity.id,
      designId: entity.designId,
      revision: entity.revision,
      graphHash: entity.graphHash,
      scenario: entity.scenario,
      findings: entity.findings,
      summary: entity.summary,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
