import { makeService } from "@/core/registry";
import type {
  BillingEventEntity,
  BillingEventHandler,
} from "@/modules/billing-events";

import { DisputesService } from "../disputes.service";

export class DisputeEventHandler implements BillingEventHandler {
  private readonly disputesService = makeService(DisputesService);

  public async handle({
    providerCustomerId,
    providerObjectId,
  }: BillingEventEntity): Promise<void> {
    if (providerObjectId === null) return;

    await this.disputesService.sync(providerObjectId, providerCustomerId);
  }
}
