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
}
