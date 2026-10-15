import { makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { BillingCustomersService } from "@/modules/billing-customers";
import { PurchasesService } from "@/modules/purchases";
import { SubscriptionsService } from "@/modules/subscriptions";

import type { BillingAccountEntity } from "./billing-account.entity";
import { planOf, type PlanOutcome } from "./billing-plan";

export class BillingAccountService extends Service {
  private readonly billingCustomersService = makeService(
    BillingCustomersService,
  );

  private readonly subscriptionsService = makeService(SubscriptionsService);

  private readonly purchasesService = makeService(PurchasesService);

  public async accountOf(userId: string): Promise<BillingAccountEntity> {
    const [customer, subscription, purchase] = await Promise.all([
      this.billingCustomersService.findForUser(userId),
      this.subscriptionsService.currentFor(userId),
      this.purchasesService.currentFor(userId),
    ]);

    return { customer, subscription, purchase };
  }

  public async planOf(userId: string): Promise<PlanOutcome> {
    return planOf(await this.accountOf(userId));
  }
}
