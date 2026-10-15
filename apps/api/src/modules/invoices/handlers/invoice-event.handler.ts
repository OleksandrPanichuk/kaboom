import { makeService } from "@/core/registry";
import type {
  BillingEventEntity,
  BillingEventHandler,
} from "@/modules/billing-events";

import { InvoicesService } from "../invoices.service";

export class InvoiceEventHandler implements BillingEventHandler {
  public async handle({
    providerCustomerId,
    providerObjectId,
  }: BillingEventEntity): Promise<void> {
    if (providerCustomerId === null || providerObjectId === null) return;

    await makeService(InvoicesService).sync(
      providerCustomerId,
      providerObjectId,
    );
  }
}
