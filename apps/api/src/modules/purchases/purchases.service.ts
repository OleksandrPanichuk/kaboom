import { make, makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { BillingCustomersService } from "@/modules/billing-customers";
import { BillingOffersService } from "@/modules/billing-offers";
import {
  BillingProvider,
  type ProviderInvoice,
} from "@/modules/billing-provider";

import { PurchasesRepository, type SyncPurchaseData } from "./ports";
import type { PurchaseEntity } from "./purchase.entity";
import {
  LIVE_PURCHASE_STATUSES,
  PURCHASE_STATUS_BY_INVOICE,
} from "./purchases.constants";
import { PurchaseConflictError } from "./purchases.errors";

export class PurchasesService extends Service {
  private get provider() {
    return make(BillingProvider);
  }

  private readonly purchases = makeRepository(PurchasesRepository);

  private readonly customers = makeService(BillingCustomersService);

  private readonly offers = makeService(BillingOffersService);

  public sync(
    providerCustomerId: string,
    providerInvoiceId: string,
  ): Promise<PurchaseEntity | null> {
    return this.customers.locked(providerCustomerId, async () => {
      const customer = await this.customers.ensure(providerCustomerId);
      const purchase = await this.purchaseOf(providerInvoiceId);

      if (!purchase) return null;

      const data = { ...purchase, userId: customer?.userId ?? null };

      if (LIVE_PURCHASE_STATUSES.includes(data.status)) {
        await this.settleOthers(data);
      }

      return this.purchases.sync(data, new Date());
    });
  }

  private async settleOthers(incoming: SyncPurchaseData): Promise<void> {
    const others = await this.purchases.listLive(
      this.provider.name,
      incoming.providerCustomerId,
    );

    for (const other of others) {
      if (other.providerInvoiceId === incoming.providerInvoiceId) continue;

      const purchase = await this.purchaseOf(other.providerInvoiceId);
      const settled = purchase
        ? await this.purchases.sync(
            { ...purchase, userId: incoming.userId },
            new Date(),
          )
        : other;

      if (LIVE_PURCHASE_STATUSES.includes(settled.status)) {
        throw new PurchaseConflictError(
          `The ${this.provider.name} customer ${incoming.providerCustomerId} has two live lifetime purchases, on invoices ${settled.providerInvoiceId} and ${incoming.providerInvoiceId}`,
        );
      }
    }
  }

  private async purchaseOf(
    providerInvoiceId: string,
  ): Promise<Omit<SyncPurchaseData, "userId"> | null> {
    const invoice = await this.provider.findInvoice(providerInvoiceId);

    if (invoice?.subscriptionId !== null) return null;
    if (invoice.status === "draft") return null;

    const priceId = await this.lifetimePriceOf(invoice);

    if (priceId === null) return null;

    return {
      provider: this.provider.name,
      providerCustomerId: invoice.customerId,
      providerPriceId: priceId,
      providerInvoiceId: invoice.id,
      providerPaymentId: invoice.paymentIds[0] ?? null,
      status: PURCHASE_STATUS_BY_INVOICE[invoice.status],
      amount: invoice.total,
      currency: invoice.currency,
      paidAt: invoice.paidAt,
    };
  }

  private async lifetimePriceOf(
    invoice: ProviderInvoice,
  ): Promise<string | null> {
    for (const priceId of invoice.priceIds) {
      const price = await this.offers.findPrice(priceId);

      if (price?.type === "one_time") return priceId;
    }

    return null;
  }
}
