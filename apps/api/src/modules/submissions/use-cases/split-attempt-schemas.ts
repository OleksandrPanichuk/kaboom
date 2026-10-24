import type { DesignOp } from "@repo/design";
import { splitSchemas } from "@repo/scoring";

import { make, makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { transaction } from "@/db/executor";
import {
  ApplyDesignOpsUseCase,
  CreateDesignUseCase,
  type DesignLayout,
  DesignsRepository,
} from "@/modules/designs";

import { ProblemAttemptsRepository } from "../ports";
import type { AttemptEntity } from "../submission.entity";

export interface SplitAttemptSchemasUseCaseOptions {
  apply: boolean;
}

export interface AttemptSplit {
  attemptId: string;
  designId: string;
  status: "split" | "would-split" | "skipped";
  reason?: string;
  schemas: Array<{ name: string; tables: number; designId?: string }>;
}

type Options = SplitAttemptSchemasUseCaseOptions;
type Result = AttemptSplit[];

const pick = (layout: DesignLayout, ids: ReadonlySet<string>, keep: boolean) =>
  Object.fromEntries(
    Object.entries(layout).filter(([id]) => ids.has(id) === keep),
  );

export class SplitAttemptSchemasUseCase extends UseCase<Options, Result> {
  private readonly attempts = makeRepository(ProblemAttemptsRepository);

  private readonly designs = makeRepository(DesignsRepository);

  private split(attempt: AttemptEntity, apply: boolean): Promise<AttemptSplit> {
    return transaction(async () => {
      const base = {
        attemptId: attempt.id,
        designId: attempt.designId,
        schemas: [],
      };
      const design = await this.designs.lockOwned(
        attempt.designId,
        attempt.userId,
      );

      if (!design) {
        return { ...base, status: "skipped", reason: "design not found" };
      }

      if (design.lockedAt) {
        return { ...base, status: "skipped", reason: "design is locked" };
      }

      const { schemas } = splitSchemas(design.graph);

      if (schemas.length === 0) {
        return { ...base, status: "skipped", reason: "no tables to move" };
      }

      const labelOf = (id: string) =>
        design.graph.nodes.find((node) => node.id === id)?.label ?? id;
      const planned = schemas.map((schema) => ({
        name: `${design.name}: ${labelOf(schema.holder)}`,
        tables: schema.graph.nodes.length,
      }));

      if (!apply) return { ...base, status: "would-split", schemas: planned };

      const create = make(CreateDesignUseCase);
      const moved = new Set(
        schemas.flatMap((schema) => schema.graph.nodes.map((node) => node.id)),
      );
      const created: Array<{ holder: string; designId: string }> = [];

      for (const [index, schema] of schemas.entries()) {
        const made = await create.execute({
          ownerId: attempt.userId,
          name: planned[index]!.name,
          kind: "schema",
          origin: "problem",
          baseline: schema.graph,
        });
        const nodes = new Set(schema.graph.nodes.map((node) => node.id));

        await this.designs.saveLayout(
          made.id,
          attempt.userId,
          pick(design.layout, nodes, true),
        );
        created.push({ holder: schema.holder, designId: made.id });
      }

      const ops: DesignOp[] = [
        ...[...moved].map((id): DesignOp => ({ op: "remove-node", id })),
        ...schemas.flatMap((schema) =>
          schema.graph.groups.map((group): DesignOp => ({
            op: "remove-group",
            id: group.id,
          })),
        ),
        ...created.map(({ holder, designId }): DesignOp => ({
          op: "update-node",
          id: holder,
          patch: { schema: { designId } },
        })),
      ];

      await make(ApplyDesignOpsUseCase).execute({
        ownerId: attempt.userId,
        id: design.id,
        author: "system",
        baseRevision: design.revision,
        ops,
      });
      await this.designs.saveLayout(
        design.id,
        attempt.userId,
        pick(design.layout, moved, false),
      );

      return {
        ...base,
        status: "split",
        schemas: planned.map((schema, index) => ({
          ...schema,
          designId: created[index]!.designId,
        })),
      };
    });
  }

  public async execute({ apply }: Options): Promise<Result> {
    const results: AttemptSplit[] = [];

    for (const attempt of await this.attempts.listAll()) {
      results.push(await this.split(attempt, apply));
    }

    return results;
  }
}
