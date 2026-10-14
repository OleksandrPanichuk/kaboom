import z from "zod";

import { make, makeRepository } from "@/core/registry";
import { Service } from "@/core/service";
import { transaction } from "@/db/executor";
import { BillingProvider } from "@/modules/billing-provider";

import type { BillingCustomerEntity } from "./billing-customer.entity";
import { BillingCustomersRepository } from "./ports";

const UserId = z.uuid();

export class BillingCustomersService extends Service {
  private get provider() {
    return make(BillingProvider);
  }

  private readonly customers = makeRepository(BillingCustomersRepository);

  public locked<T>(
    providerCustomerId: string,
    work: () => Promise<T>,
  ): Promise<T> {
    return transaction(async () => {
      await this.customers.lock(this.provider.name, providerCustomerId);

      return work();
    });
  }

  public sync(
    providerCustomerId: string,
  ): Promise<BillingCustomerEntity | null> {
    return this.locked(providerCustomerId, () =>
      this.refresh(providerCustomerId),
    );
  }

  public async ensure(
    providerCustomerId: string,
  ): Promise<BillingCustomerEntity | null> {
    return (
      (await this.customers.findByProviderId(
        this.provider.name,
        providerCustomerId,
      )) ?? this.refresh(providerCustomerId)
    );
  }

  private async refresh(
    providerCustomerId: string,
  ): Promise<BillingCustomerEntity | null> {
    const customer = await this.provider.findCustomer(providerCustomerId);
    const now = new Date();

    if (!customer) {
      await this.customers.markDeleted(
        this.provider.name,
        providerCustomerId,
        now,
      );

      return null;
    }

    const userId = UserId.safeParse(customer.userId);

    return this.customers.sync(
      {
        ...customer,
        provider: this.provider.name,
        userId: userId.success ? userId.data : null,
      },
      now,
    );
  }
}
