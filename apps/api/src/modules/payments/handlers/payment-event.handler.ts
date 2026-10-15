import { makeService } from "@/core/registry";
import type {
  BillingEventEntity,
  BillingEventHandler,
} from "@/modules/billing-events";

import { PaymentsService } from "../payments.service";

export class PaymentEventHandler implements BillingEventHandler {
  public async handle({
    providerCustomerId,
    providerObjectId,
  }: BillingEventEntity): Promise<void> {
    if (providerCustomerId === null || providerObjectId === null) return;

    await makeService(PaymentsService).sync(
      providerCustomerId,
      providerObjectId,
    );
  }
}
