import { emptyGraph } from "@repo/design";

import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { transaction } from "@/db/executor";

import type { DesignEntity } from "../design.entity";
import { hashGraph } from "../design.hash";
import { DesignRevisionsRepository, DesignsRepository } from "../ports";

export interface CreateDesignUseCaseOptions {
  ownerId: string;
  name: string;
}

type Options = CreateDesignUseCaseOptions;
type Result = DesignEntity;

export class CreateDesignUseCase extends UseCase<Options, Result> {
  private readonly designs = makeRepository(DesignsRepository);

  private readonly revisions = makeRepository(DesignRevisionsRepository);

  public execute({ ownerId, name }: Options): Promise<Result> {
    const graph = emptyGraph();
    const graphHash = hashGraph(graph);

    return transaction(async () => {
      const design = await this.designs.insert({
        ownerId,
        name,
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
