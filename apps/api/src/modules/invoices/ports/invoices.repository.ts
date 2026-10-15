import type { Page, PageRequest } from "@/core/pagination";
import { Repository } from "@/core/repository";
import type { BillingProviderName } from "@/db";
import type { ProviderInvoice } from "@/modules/billing-provider";

import type { InvoiceEntity } from "../invoice.entity";

export interface SyncInvoiceData extends ProviderInvoice {
  provider: BillingProviderName;
  userId: string | null;
}

export abstract class InvoicesRepository extends Repository {
  public abstract findByProviderId(
    provider: BillingProviderName,
    providerInvoiceId: string,
  ): Promise<InvoiceEntity | null>;

  public abstract sync(data: SyncInvoiceData, at: Date): Promise<InvoiceEntity>;

  public abstract listForUser(
    provider: BillingProviderName,
    userId: string,
    page: PageRequest,
  ): Promise<Page<InvoiceEntity>>;
}
