import { makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { EntitlementsService, PlanLimitError } from "@/modules/entitlements";

import { DesignsRepository } from "./ports";

export interface DesignQuota {
  limit: number | null;
  used: number;
}

export class DesignQuotaService extends Service {
  private readonly entitlements = makeService(EntitlementsService);

  private readonly designs = makeRepository(DesignsRepository);

  public async of(ownerId: string): Promise<DesignQuota> {
    const { entitlements } = await this.entitlements.of(ownerId);

    return {
      limit: entitlements.sandboxDesigns,
      used: await this.designs.countOwned(ownerId, "sandbox"),
    };
  }

  public async require(ownerId: string): Promise<void> {
    const { limit, used } = await this.of(ownerId);

    if (limit !== null && used >= limit) {
      throw new PlanLimitError("You have as many designs as Free allows", {
        feature: "designs",
        limit,
      });
    }
  }
}
