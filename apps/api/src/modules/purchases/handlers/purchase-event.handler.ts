import { makeService } from "@/core/registry";
import type {
  BillingEventEntity,
  BillingEventHandler,
} from "@/modules/billing-events";

import { PurchasesService } from "../purchases.service";

export class PurchaseEventHandler implements BillingEventHandler {
  private readonly purchasesService = makeService(PurchasesService);

  public async handle({
    providerCustomerId,
    providerObjectId,
  }: BillingEventEntity): Promise<void> {
    if (providerCustomerId === null || providerObjectId === null) return;

    await this.purchasesService.sync(providerCustomerId, providerObjectId);
  }
}
