import z from "zod";

import { make, makeRepository } from "@/core/registry";
import { Service } from "@/core/service";
import { transaction } from "@/db/executor";
import {
  BillingProvider,
  type ProviderCustomer,
  type UpdateProviderCustomerData,
} from "@/modules/billing-provider";

import type { BillingCustomerEntity } from "./billing-customer.entity";
import { BillingCustomersRepository } from "./ports";

const UserId = z.uuid();

export interface BillingUser {
  id: string;
  email: string;
  name: string;
}

export class BillingCustomersService extends Service {
  private readonly provider = make(BillingProvider);

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

  public lockedFor<T>(
    providerCustomerId: string | null,
    work: () => Promise<T>,
  ): Promise<T> {
    return providerCustomerId === null
      ? transaction(work)
      : this.locked(providerCustomerId, work);
  }

  public sync(
    providerCustomerId: string,
  ): Promise<BillingCustomerEntity | null> {
    return this.locked(providerCustomerId, () =>
      this.refresh(providerCustomerId),
    );
  }

  public findForUser(userId: string): Promise<BillingCustomerEntity | null> {
    return this.customers.findByUser(this.provider.name, userId);
  }

  public forUser(user: BillingUser): Promise<BillingCustomerEntity> {
    return transaction(async () => {
      await this.customers.lockUser(user.id);

      const existing = await this.customers.findByUser(
        this.provider.name,
        user.id,
      );

      if (existing) return existing;

      const customer = await this.provider.createCustomer({
        userId: user.id,
        email: user.email,
        name: user.name,
      });

      return this.locked(customer.id, () =>
        this.customers.sync(
          { ...customer, provider: this.provider.name, userId: user.id },
          new Date(),
        ),
      );
    });
  }

  public async updateDetails(
    user: BillingUser,
    details: UpdateProviderCustomerData,
  ): Promise<BillingCustomerEntity> {
    const customer = await this.forUser(user);

    return this.record(
      await this.provider.updateCustomer(customer.providerCustomerId, details),
    );
  }

  public record(customer: ProviderCustomer): Promise<BillingCustomerEntity> {
    return this.locked(customer.id, () =>
      this.customers.sync(
        { ...customer, provider: this.provider.name, userId: null },
        new Date(),
      ),
    );
  }

  public async removeForUser(userId: string): Promise<void> {
    const customer = await this.findForUser(userId);

    if (!customer) return;

    await this.locked(customer.providerCustomerId, async () => {
      await this.provider.deleteCustomer(customer.providerCustomerId);
      await this.customers.markDeleted(
        this.provider.name,
        customer.providerCustomerId,
        new Date(),
      );
    });
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
