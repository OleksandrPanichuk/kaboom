import { makeRepository } from "@/core/registry";
import { Service } from "@/core/service";

import type { DesignEntity } from "./design.entity";
import { DesignNotFoundError } from "./designs.errors";
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

  public async assertOwned(id: string, ownerId: string): Promise<void> {
    if (!(await this.repository.existsOwned(id, ownerId))) {
      throw new DesignNotFoundError("Design not found");
    }
  }
}
