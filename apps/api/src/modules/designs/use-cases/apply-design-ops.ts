import { applyOps, type DesignOp } from "@repo/design";

import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import type { DesignRevisionAuthor } from "@/db";
import { transaction } from "@/db/executor";

import type { DesignEntity } from "../design.entity";
import { hashGraph } from "../design.hash";
import type { DesignRevisionEntity } from "../design-revision.entity";
import {
  DesignNotFoundError,
  DesignOpRejectedError,
  DesignRevisionConflictError,
} from "../designs.errors";
import { DesignRevisionsRepository, DesignsRepository } from "../ports";

export interface ApplyDesignOpsUseCaseOptions {
  ownerId: string;
  id: string;
  author: Exclude<DesignRevisionAuthor, "system">;
  baseRevision: number;
  ops: DesignOp[];
}

type Options = ApplyDesignOpsUseCaseOptions;

interface Result {
  design: DesignEntity;
  revision: DesignRevisionEntity;
}

export class ApplyDesignOpsUseCase extends UseCase<Options, Result> {
  private readonly designs = makeRepository(DesignsRepository);

  private readonly revisions = makeRepository(DesignRevisionsRepository);

  public execute({
    ownerId,
    id,
    author,
    baseRevision,
    ops,
  }: Options): Promise<Result> {
    return transaction(async () => {
      const design = await this.designs.lockOwned(id, ownerId);

      if (!design) throw new DesignNotFoundError("Design not found");

      if (design.revision !== baseRevision) {
        throw new DesignRevisionConflictError(design.revision);
      }

      const result = applyOps(design.graph, ops);

      if (!result.ok) throw new DesignOpRejectedError(result);

      const number = design.revision + 1;
      const graphHash = hashGraph(result.graph);

      const revision = await this.revisions.insert({
        designId: id,
        number,
        author,
        ops,
        inverse: result.inverse,
        snapshot: null,
        graphHash,
      });

      const saved = await this.designs.saveGraph(id, {
        graph: result.graph,
        revision: number,
        graphHash,
      });

      return { design: saved, revision };
    });
  }
}
