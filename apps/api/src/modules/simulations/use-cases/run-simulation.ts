import {
  type DesignGraph,
  evaluateLoad,
  LoadScenarioSchema,
} from "@repo/design";
import z from "zod";

import { makeRepository, makeService } from "@/core/registry";
import { make } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { DesignsService, GetDesignRevisionUseCase } from "@/modules/designs";

import { SimulationRunsRepository } from "../ports";
import { summarize } from "../simulation.summary";
import type { SimulationRunEntity } from "../simulation-run.entity";
import { SimulationScenarioInvalidError } from "../simulations.errors";

export interface RunSimulationUseCaseOptions {
  ownerId: string;
  designId: string;
  scenario: unknown;
  revision?: number;
}

type Options = RunSimulationUseCaseOptions;
type Result = SimulationRunEntity;

interface Target {
  revision: number;
  graphHash: string;
  graph: DesignGraph;
}

export class RunSimulationUseCase extends UseCase<Options, Result> {
  private readonly designs = makeService(DesignsService);

  private readonly runs = makeRepository(SimulationRunsRepository);

  public async execute({
    ownerId,
    designId,
    scenario: input,
    revision,
  }: Options): Promise<Result> {
    const target = await this.target(ownerId, designId, revision);
    const parsed = LoadScenarioSchema.safeParse(input);

    if (!parsed.success) {
      throw new SimulationScenarioInvalidError("The scenario is not valid", {
        issues: z.prettifyError(parsed.error),
      });
    }

    const scenario = parsed.data;
    const known = new Set(target.graph.nodes.map((node) => node.id));
    const groups = new Set(target.graph.groups.map((group) => group.id));
    const unknown = scenario.faults.flatMap((fault) =>
      "nodeId" in fault && !known.has(fault.nodeId) ? [fault.nodeId] : [],
    );
    const unknownGroups = scenario.faults.flatMap((fault) =>
      fault.kind === "region-down" && !groups.has(fault.groupId)
        ? [fault.groupId]
        : [],
    );

    if (unknown.length > 0) {
      throw new SimulationScenarioInvalidError(
        "A fault names a node the design does not have",
        { unknownNodes: [...new Set(unknown)] },
      );
    }

    if (unknownGroups.length > 0) {
      throw new SimulationScenarioInvalidError(
        "A fault names a region the design does not have",
        { unknownGroups: [...new Set(unknownGroups)] },
      );
    }

    const result = evaluateLoad(target.graph, scenario);

    return this.runs.insert({
      designId,
      revision: target.revision,
      graphHash: target.graphHash,
      scenario,
      findings: result.findings,
      summary: summarize(result, scenario),
    });
  }

  private async target(
    ownerId: string,
    designId: string,
    revision: number | undefined,
  ): Promise<Target> {
    const design = await this.designs.getOwned(designId, ownerId);

    if (revision === undefined || revision === design.revision) {
      return {
        revision: design.revision,
        graphHash: design.graphHash,
        graph: design.graph,
      };
    }

    const past = await make(GetDesignRevisionUseCase).execute({
      ownerId,
      id: designId,
      number: revision,
    });

    return {
      revision: past.revision.number,
      graphHash: past.revision.graphHash,
      graph: past.graph,
    };
  }
}
