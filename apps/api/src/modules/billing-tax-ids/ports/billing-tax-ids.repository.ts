import { Repository } from "@/core/repository";
import type { BillingProviderName } from "@/db";
import type { ProviderTaxId } from "@/modules/billing-provider";

import type { BillingTaxIdEntity } from "../billing-tax-id.entity";

export interface SyncBillingTaxIdData extends ProviderTaxId {
  provider: BillingProviderName;
  userId: string | null;
}

export abstract class BillingTaxIdsRepository extends Repository {
  public abstract sync(
    data: SyncBillingTaxIdData,
    at: Date,
  ): Promise<BillingTaxIdEntity>;

  public abstract remove(
    provider: BillingProviderName,
    providerTaxId: string,
  ): Promise<void>;
}
