import type { Page, PageRequest } from "@/core/pagination";
import { Repository } from "@/core/repository";
import type { BillingProviderName } from "@/db";
import type { ProviderPayment } from "@/modules/billing-provider";

import type { PaymentEntity } from "../payment.entity";

export interface SyncPaymentData extends ProviderPayment {
  provider: BillingProviderName;
  userId: string | null;
}

export abstract class PaymentsRepository extends Repository {
  public abstract sync(data: SyncPaymentData, at: Date): Promise<PaymentEntity>;

  public abstract listForUser(
    provider: BillingProviderName,
    userId: string,
    page: PageRequest,
  ): Promise<Page<PaymentEntity>>;
}
