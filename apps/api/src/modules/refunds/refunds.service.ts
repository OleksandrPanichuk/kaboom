import { make, makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { BillingCustomersService } from "@/modules/billing-customers";
import { BillingProvider } from "@/modules/billing-provider";
import { PaymentsService } from "@/modules/payments";
import { PurchasesService } from "@/modules/purchases";

import { RefundsRepository } from "./ports";
import type { RefundEntity } from "./refund.entity";

export class RefundsService extends Service {
  private readonly provider = make(BillingProvider);

  private readonly refunds = makeRepository(RefundsRepository);

  private readonly billingCustomersService = makeService(
    BillingCustomersService,
  );

  private readonly paymentsService = makeService(PaymentsService);

  private readonly purchasesService = makeService(PurchasesService);

  public async sync(
    providerRefundId: string,
    providerCustomerId: string | null,
  ): Promise<RefundEntity | null> {
    const customerId =
      providerCustomerId ??
      (await this.provider.findRefund(providerRefundId))?.customerId ??
      null;

    return this.billingCustomersService.lockedFor(customerId, async () => {
      const customer =
        customerId === null
          ? null
          : await this.billingCustomersService.ensure(customerId);
      const refund = await this.provider.findRefund(providerRefundId);

      if (!refund) return null;

      const row = await this.refunds.sync(
        {
          ...refund,
          provider: this.provider.name,
          userId: customer?.userId ?? null,
        },
        new Date(),
      );

      if (customerId !== null && refund.paymentId !== null) {
        await this.paymentsService.sync(customerId, refund.paymentId);
      }

      if (refund.invoiceId !== null) {
        await this.purchasesService.recordRefunds(refund.invoiceId, {
          refunded: await this.refunds.totalRefunded(
            this.provider.name,
            refund.invoiceId,
          ),
        });
      }

      return row;
    });
  }
}
