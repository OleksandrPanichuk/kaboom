import { type DesignGraph, emptyGraph } from "@repo/design";

import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import type { DesignKind, DesignOrigin } from "@/db";
import { transaction } from "@/db/executor";

import type { DesignEntity } from "../design.entity";
import { hashGraph } from "../design.hash";
import { DesignQuotaService } from "../design-quota.service";
import { DesignRevisionsRepository, DesignsRepository } from "../ports";

export interface CreateDesignUseCaseOptions {
  ownerId: string;
  name: string;
  kind?: DesignKind;
  origin: DesignOrigin;
  baseline?: DesignGraph;
}

type Options = CreateDesignUseCaseOptions;
type Result = DesignEntity;

export class CreateDesignUseCase extends UseCase<Options, Result> {
  private readonly quota = makeService(DesignQuotaService);

  private readonly designs = makeRepository(DesignsRepository);

  private readonly revisions = makeRepository(DesignRevisionsRepository);

  public async execute({
    ownerId,
    name,
    kind,
    origin,
    baseline,
  }: Options): Promise<Result> {
    const graph = baseline ?? emptyGraph();
    const graphHash = hashGraph(graph);

    if (origin === "sandbox") await this.quota.require(ownerId);

    return transaction(async () => {
      const design = await this.designs.insert({
        ownerId,
        name,
        kind,
        origin,
        graph,
        graphHash,
      });

      await this.revisions.insert({
        designId: design.id,
        number: 0,
        author: "system",
        ops: [],
        inverse: [],
        snapshot: graph,
        graphHash,
      });

      return design;
    });
  }
}
