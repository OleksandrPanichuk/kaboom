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
import { purchaseAfterRefunds, type PurchaseRefunds } from "./purchase-refunds";
import {
  LIVE_PURCHASE_STATUSES,
  PURCHASE_STATUS_BY_INVOICE,
} from "./purchases.constants";
import { PurchaseConflictError } from "./purchases.errors";

export class PurchasesService extends Service {
  private readonly provider = make(BillingProvider);

  private readonly purchases = makeRepository(PurchasesRepository);

  private readonly billingCustomersService = makeService(
    BillingCustomersService,
  );

  private readonly billingOffersService = makeService(BillingOffersService);

  public sync(
    providerCustomerId: string,
    providerInvoiceId: string,
  ): Promise<PurchaseEntity | null> {
    return this.billingCustomersService.locked(providerCustomerId, async () => {
      const customer =
        await this.billingCustomersService.ensure(providerCustomerId);
      const purchase = await this.purchaseOf(providerInvoiceId);

      if (!purchase) return null;

      const data = { ...purchase, userId: customer?.userId ?? null };

      if (LIVE_PURCHASE_STATUSES.includes(data.status)) {
        await this.settleOthers(data);
      }

      return this.purchases.sync(data, new Date());
    });
  }

  public currentFor(userId: string): Promise<PurchaseEntity | null> {
    return this.purchases.findCurrentForUser(this.provider.name, userId);
  }

  public async recordRefunds(
    providerInvoiceId: string,
    refunds: PurchaseRefunds,
  ): Promise<void> {
    const purchase = await this.purchases.findByInvoice(
      this.provider.name,
      providerInvoiceId,
    );

    if (!purchase) return;

    const now = new Date();
    const refunded = purchaseAfterRefunds(purchase, refunds, now);

    if (refunded)
      await this.purchases.recordRefunds(purchase.id, refunded, now);
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
      const price = await this.billingOffersService.findPrice(priceId);

      if (price?.type === "one_time") return priceId;
    }

    return null;
  }
}
