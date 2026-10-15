import { make, makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { BillingCustomersService } from "@/modules/billing-customers";
import { BillingProvider } from "@/modules/billing-provider";

import type { BillingTaxIdEntity } from "./billing-tax-id.entity";
import { BillingTaxIdsRepository } from "./ports";

export class BillingTaxIdsService extends Service {
  private readonly provider = make(BillingProvider);

  private readonly taxIds = makeRepository(BillingTaxIdsRepository);

  private readonly billingCustomersService = makeService(
    BillingCustomersService,
  );

  public sync(
    providerCustomerId: string,
    providerTaxId: string,
  ): Promise<BillingTaxIdEntity | null> {
    return this.billingCustomersService.locked(providerCustomerId, async () => {
      const customer =
        await this.billingCustomersService.ensure(providerCustomerId);
      const taxId = await this.provider.findTaxId(
        providerCustomerId,
        providerTaxId,
      );

      if (!taxId) {
        await this.taxIds.remove(this.provider.name, providerTaxId);

        return null;
      }

      return this.taxIds.sync(
        {
          ...taxId,
          provider: this.provider.name,
          userId: customer?.userId ?? null,
        },
        new Date(),
      );
    });
  }
}
