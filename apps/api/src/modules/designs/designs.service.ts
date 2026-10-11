import {
  bundleConflicts,
  type DesignBundle,
  schemaReferences,
} from "@repo/scoring";

import { makeRepository } from "@/core/registry";
import { Service } from "@/core/service";

import type { DesignEntity, ResolvedSchema } from "./design.entity";
import {
  DesignNotFoundError,
  DesignSchemaConflictError,
} from "./designs.errors";
import { DesignsRepository } from "./ports";

export class DesignsService extends Service {
  private readonly repository = makeRepository(DesignsRepository);

  public async getOwned(id: string, ownerId: string): Promise<DesignEntity> {
    const entity = await this.repository.findOwned(id, ownerId);

    if (!entity) {
      throw new DesignNotFoundError("Design not found");
    }

    return entity;
  }

  public async bundleOf(
    design: DesignEntity,
  ): Promise<{ bundle: DesignBundle; schemas: ResolvedSchema[] }> {
    const found = await Promise.all(
      [...schemaReferences(design.graph).keys()].map((id) =>
        this.repository.findOwned(id, design.ownerId),
      ),
    );
    const schemas = found
      .filter((schema) => schema?.kind === "schema")
      .map((schema) => ({
        designId: schema!.id,
        revision: schema!.revision,
        graphHash: schema!.graphHash,
        graph: schema!.graph,
      }));
    const bundle: DesignBundle = {
      system: design.graph,
      schemas: Object.fromEntries(
        schemas.map((schema) => [schema.designId, schema.graph]),
      ),
    };
    const conflicts = bundleConflicts(bundle);

    if (conflicts.length > 0) {
      throw new DesignSchemaConflictError(
        "The design and a schema it names use the same ids",
        { ids: conflicts },
      );
    }

    return { bundle, schemas };
  }

  public lock(id: string): Promise<void> {
    return this.repository.lock(id);
  }

  public async assertOwned(id: string, ownerId: string): Promise<void> {
    if (!(await this.repository.existsOwned(id, ownerId))) {
      throw new DesignNotFoundError("Design not found");
    }
  }
}
