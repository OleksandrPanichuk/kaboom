import { makeService } from "@/core/registry";
import type {
  BillingEventEntity,
  BillingEventHandler,
} from "@/modules/billing-events";

import { RefundsService } from "../refunds.service";

export class RefundEventHandler implements BillingEventHandler {
  private readonly refundsService = makeService(RefundsService);

  public async handle({
    providerCustomerId,
    providerObjectId,
  }: BillingEventEntity): Promise<void> {
    if (providerObjectId === null) return;

    await this.refundsService.sync(providerObjectId, providerCustomerId);
  }
}
