import { makeService } from "@/core/registry";
import type {
  BillingEventEntity,
  BillingEventHandler,
} from "@/modules/billing-events";

import { InvoicesService } from "../invoices.service";

export class InvoiceEventHandler implements BillingEventHandler {
  private readonly invoicesService = makeService(InvoicesService);

  public async handle({
    providerCustomerId,
    providerObjectId,
  }: BillingEventEntity): Promise<void> {
    if (providerCustomerId === null || providerObjectId === null) return;

    await this.invoicesService.sync(providerCustomerId, providerObjectId);
  }
}
