import { Repository } from "@/core/repository";
import type { BillingProviderName } from "@/db";
import type { ProviderCustomer } from "@/modules/billing-provider";

import type { BillingCustomerEntity } from "../billing-customer.entity";

export interface SyncBillingCustomerData extends ProviderCustomer {
  provider: BillingProviderName;
}

export abstract class BillingCustomersRepository extends Repository {
  public abstract lock(
    provider: BillingProviderName,
    providerCustomerId: string,
  ): Promise<void>;

  public abstract findByProviderId(
    provider: BillingProviderName,
    providerCustomerId: string,
  ): Promise<BillingCustomerEntity | null>;

  public abstract sync(
    data: SyncBillingCustomerData,
    at: Date,
  ): Promise<BillingCustomerEntity>;

  public abstract markDeleted(
    provider: BillingProviderName,
    providerCustomerId: string,
    at: Date,
  ): Promise<void>;
}
