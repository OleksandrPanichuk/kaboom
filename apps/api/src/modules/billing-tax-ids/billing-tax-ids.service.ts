import { make, makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import {
  BillingCustomersService,
  type BillingUser,
} from "@/modules/billing-customers";
import {
  BillingProvider,
  type CreateProviderTaxIdData,
} from "@/modules/billing-provider";

import type { BillingTaxIdEntity } from "./billing-tax-id.entity";
import { BillingTaxIdNotFoundError } from "./billing-tax-ids.errors";
import { BillingTaxIdsRepository } from "./ports";

export class BillingTaxIdsService extends Service {
  private readonly provider = make(BillingProvider);

  private readonly taxIds = makeRepository(BillingTaxIdsRepository);

  private readonly billingCustomersService = makeService(
    BillingCustomersService,
  );

  public list(userId: string): Promise<BillingTaxIdEntity[]> {
    return this.taxIds.listForUser(this.provider.name, userId);
  }

  public async add(
    user: BillingUser,
    data: CreateProviderTaxIdData,
  ): Promise<BillingTaxIdEntity> {
    const customer = await this.billingCustomersService.forUser(user);
    const taxId = await this.provider.createTaxId(
      customer.providerCustomerId,
      data,
    );

    return this.billingCustomersService.locked(taxId.customerId, () =>
      this.taxIds.sync(
        { ...taxId, provider: this.provider.name, userId: user.id },
        new Date(),
      ),
    );
  }

  public async remove(userId: string, id: string): Promise<void> {
    const taxId = await this.taxIds.findForUser(this.provider.name, userId, id);

    if (!taxId) throw new BillingTaxIdNotFoundError("You have no such tax id");

    await this.billingCustomersService.locked(
      taxId.providerCustomerId,
      async () => {
        await this.provider.deleteTaxId(
          taxId.providerCustomerId,
          taxId.providerTaxId,
        );
        await this.taxIds.remove(this.provider.name, taxId.providerTaxId);
      },
    );
  }

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
