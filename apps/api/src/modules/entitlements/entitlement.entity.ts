import type { AccountPlan, PlanSource } from "@/modules/billing-account";

import type { PlanEntitlements } from "./entitlements.constants";
import type { EntitlementsModel } from "./entitlements.model";

export interface EntitlementsEntity {
  plan: AccountPlan;
  source: PlanSource | null;
  entitlements: PlanEntitlements;
}

export class EntitlementsEntity {
  public static normalize(entity: EntitlementsEntity): EntitlementsModel {
    return {
      plan: entity.plan,
      source: entity.source,
      interviews: entity.entitlements.interviews,
      sandboxDesigns: entity.entitlements.sandboxDesigns,
      fullReview: entity.entitlements.fullReview,
      replay: entity.entitlements.replay,
    };
  }
}
