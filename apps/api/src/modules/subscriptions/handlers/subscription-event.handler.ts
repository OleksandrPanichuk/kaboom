import { makeService } from "@/core/registry";
import type {
  BillingEventEntity,
  BillingEventHandler,
} from "@/modules/billing-events";

import { SubscriptionsService } from "../subscriptions.service";

export class SubscriptionEventHandler implements BillingEventHandler {
  public async handle(event: BillingEventEntity): Promise<void> {
    if (event.providerCustomerId === null || event.providerObjectId === null) {
      return;
    }

    await makeService(SubscriptionsService).sync(
      event.providerCustomerId,
      event.providerObjectId,
      { billingEventId: event.id, at: event.providerCreatedAt },
    );
  }
}
