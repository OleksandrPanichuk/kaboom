import { makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { BillingAccountService } from "@/modules/billing-account";

import type { EntitlementsEntity } from "./entitlement.entity";
import { ENTITLEMENTS } from "./entitlements.constants";
import { PlanLimitError } from "./entitlements.errors";

export type Feature = "replay";

export class EntitlementsService extends Service {
  private readonly billingAccount = makeService(BillingAccountService);

  public async of(userId: string): Promise<EntitlementsEntity> {
    const { plan, source } = await this.billingAccount.planOf(userId);

    return { plan, source, entitlements: ENTITLEMENTS[plan] };
  }

  public async require(userId: string, feature: Feature): Promise<void> {
    const { entitlements } = await this.of(userId);

    if (!entitlements[feature]) {
      throw new PlanLimitError("This is part of Pro", { feature });
    }
  }
}
