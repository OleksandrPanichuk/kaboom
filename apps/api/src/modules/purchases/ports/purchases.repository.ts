import { Repository } from "@/core/repository";
import type { BillingProviderName, PurchaseStatus } from "@/db";

import type { PurchaseEntity } from "../purchase.entity";

export interface SyncPurchaseData {
  provider: BillingProviderName;
  userId: string | null;
  providerCustomerId: string;
  providerPriceId: string;
  providerInvoiceId: string;
  providerPaymentId: string | null;
  status: PurchaseStatus;
  amount: number;
  currency: string;
  paidAt: Date | null;
}

export abstract class PurchasesRepository extends Repository {
  public abstract listLive(
    provider: BillingProviderName,
    providerCustomerId: string,
  ): Promise<PurchaseEntity[]>;

  public abstract sync(
    data: SyncPurchaseData,
    at: Date,
  ): Promise<PurchaseEntity>;
}
