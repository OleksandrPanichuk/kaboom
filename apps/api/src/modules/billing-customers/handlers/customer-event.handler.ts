import { makeService } from "@/core/registry";
import type {
  BillingEventEntity,
  BillingEventHandler,
} from "@/modules/billing-events";

import { BillingCustomersService } from "../billing-customers.service";

export class CustomerEventHandler implements BillingEventHandler {
  private readonly billingCustomersService = makeService(
    BillingCustomersService,
  );

  public async handle({
    providerCustomerId,
  }: BillingEventEntity): Promise<void> {
    if (providerCustomerId === null) return;

    await this.billingCustomersService.sync(providerCustomerId);
  }
}
