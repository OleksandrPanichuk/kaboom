import { makeService } from "@/core/registry";
import type {
  BillingEventEntity,
  BillingEventHandler,
} from "@/modules/billing-events";

import { BillingTaxIdsService } from "../billing-tax-ids.service";

export class TaxIdEventHandler implements BillingEventHandler {
  private readonly billingTaxIdsService = makeService(BillingTaxIdsService);

  public async handle({
    providerCustomerId,
    providerObjectId,
  }: BillingEventEntity): Promise<void> {
    if (providerCustomerId === null || providerObjectId === null) return;

    await this.billingTaxIdsService.sync(providerCustomerId, providerObjectId);
  }
}
