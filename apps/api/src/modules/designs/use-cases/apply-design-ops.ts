import { applyOps, type DesignOp, schemaRefusal } from "@repo/design";

import { makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import type { DesignRevisionAuthor } from "@/db";
import { transaction } from "@/db/executor";

import type { DesignEntity } from "../design.entity";
import { hashGraph } from "../design.hash";
import type { DesignRevisionEntity } from "../design-revision.entity";
import {
  DesignLockedError,
  DesignNotFoundError,
  DesignOpRejectedError,
  DesignRevisionConflictError,
} from "../designs.errors";
import { DesignRevisionsRepository, DesignsRepository } from "../ports";

export interface ApplyDesignOpsUseCaseOptions {
  ownerId: string;
  id: string;
  author: DesignRevisionAuthor;
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

  private async assertSchemas(
    ownerId: string,
    ops: readonly DesignOp[],
    graph: DesignEntity["graph"],
  ): Promise<void> {
    for (const [index, op] of ops.entries()) {
      const target =
        op.op === "add-node"
          ? { id: op.node.id, named: op.node.schema }
          : op.op === "update-node"
            ? { id: op.id, named: op.patch.schema }
            : null;

      if (!target?.named) continue;

      const { id, named } = target;
      const node = graph.nodes.find((candidate) => candidate.id === id);
      const schema = await this.designs.findOwned(named.designId, ownerId);
      const refusal =
        schema?.kind !== "schema"
          ? "No schema design of yours has that id"
          : node
            ? schemaRefusal(node.kind, schema.graph)
            : null;

      if (refusal) {
        throw new DesignOpRejectedError({
          ok: false,
          index,
          reason: "invalid-op",
          message: refusal,
        });
      }
    }
  }

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

      if (design.lockedAt) {
        throw new DesignLockedError("The design is locked and cannot change");
      }

      if (design.revision !== baseRevision) {
        throw new DesignRevisionConflictError(design.revision);
      }

      const result = applyOps(design.graph, ops, { document: design.kind });

      if (!result.ok) throw new DesignOpRejectedError(result);

      await this.assertSchemas(ownerId, ops, result.graph);

      const number = design.revision + 1;
      const graphHash = hashGraph(result.graph);

      const revision = await this.revisions.insert({
        designId: id,
        number,
        author,
        ops: result.applied,
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
