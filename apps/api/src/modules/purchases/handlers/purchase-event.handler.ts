import { makeService } from "@/core/registry";
import type {
  BillingEventEntity,
  BillingEventHandler,
} from "@/modules/billing-events";

import { PurchasesService } from "../purchases.service";

export class PurchaseEventHandler implements BillingEventHandler {
  public async handle({
    providerCustomerId,
    providerObjectId,
  }: BillingEventEntity): Promise<void> {
    if (providerCustomerId === null || providerObjectId === null) return;

    await makeService(PurchasesService).sync(
      providerCustomerId,
      providerObjectId,
    );
  }
}
