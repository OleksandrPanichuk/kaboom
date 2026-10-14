import { makeService } from "@/core/registry";
import type {
  BillingEventEntity,
  BillingEventHandler,
} from "@/modules/billing-events";

import { BillingCustomersService } from "../billing-customers.service";

export class CustomerEventHandler implements BillingEventHandler {
  public async handle({
    providerCustomerId,
  }: BillingEventEntity): Promise<void> {
    if (providerCustomerId === null) return;

    await makeService(BillingCustomersService).sync(providerCustomerId);
  }
}
