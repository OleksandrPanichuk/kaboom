import { Repository } from "@/core/repository";
import type { BillingProviderName } from "@/db";

import type { BillingOfferEntity, OfferedPrice } from "../billing-offer.entity";

export abstract class BillingOffersRepository extends Repository {
  public abstract listActive(): Promise<BillingOfferEntity[]>;

  public abstract listOffered(
    provider: BillingProviderName,
  ): Promise<OfferedPrice[]>;

  public abstract findOffered(
    provider: BillingProviderName,
    key: string,
  ): Promise<OfferedPrice | null>;
}
