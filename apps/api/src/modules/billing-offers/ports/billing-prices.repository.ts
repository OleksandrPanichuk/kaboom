import { Repository } from "@/core/repository";
import type { BillingProviderName } from "@/db";
import type { ProviderPrice } from "@/modules/billing-provider";

import type { BillingPriceEntity } from "../billing-price.entity";

export interface SyncPriceData extends ProviderPrice {
  provider: BillingProviderName;
  offerId: string;
}

export abstract class BillingPricesRepository extends Repository {
  public abstract sync(
    prices: readonly SyncPriceData[],
    at: Date,
  ): Promise<void>;

  public abstract findByProviderId(
    provider: BillingProviderName,
    providerPriceId: string,
  ): Promise<BillingPriceEntity | null>;
}
