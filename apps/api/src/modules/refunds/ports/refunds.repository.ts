import { Repository } from "@/core/repository";
import type { BillingProviderName } from "@/db";
import type { ProviderRefund } from "@/modules/billing-provider";

import type { RefundEntity } from "../refund.entity";

export interface SyncRefundData extends ProviderRefund {
  provider: BillingProviderName;
  userId: string | null;
}

export abstract class RefundsRepository extends Repository {
  public abstract sync(data: SyncRefundData, at: Date): Promise<RefundEntity>;

  public abstract totalRefunded(
    provider: BillingProviderName,
    providerInvoiceId: string,
  ): Promise<number>;
}
