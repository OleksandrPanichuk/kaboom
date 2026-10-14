import { Repository } from "@/core/repository";
import type { PlanKey } from "@/db";

import type { BillingPriceEntity } from "../billing-price.entity";
import type { ProviderPrice } from "./billing-provider";

export interface SyncPriceData extends ProviderPrice {
  lookupKey: string;
  planKey: PlanKey;
}

export abstract class BillingPricesRepository extends Repository {
  public abstract sync(
    prices: readonly SyncPriceData[],
    at: Date,
  ): Promise<void>;

  public abstract listOffered(): Promise<BillingPriceEntity[]>;
}
