import { make, makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { BillingCustomersService } from "@/modules/billing-customers";
import { BillingProvider } from "@/modules/billing-provider";

import type { InvoiceEntity } from "./invoice.entity";
import { InvoicesRepository } from "./ports";

export class InvoicesService extends Service {
  private get provider() {
    return make(BillingProvider);
  }

  private readonly invoices = makeRepository(InvoicesRepository);

  private readonly customers = makeService(BillingCustomersService);

  public sync(
    providerCustomerId: string,
    providerInvoiceId: string,
  ): Promise<InvoiceEntity | null> {
    return this.customers.locked(providerCustomerId, async () => {
      const customer = await this.customers.ensure(providerCustomerId);
      const invoice = await this.provider.findInvoice(providerInvoiceId);

      if (!invoice) return null;

      return this.invoices.sync(
        {
          ...invoice,
          provider: this.provider.name,
          userId: customer?.userId ?? null,
        },
        new Date(),
      );
    });
  }
}
