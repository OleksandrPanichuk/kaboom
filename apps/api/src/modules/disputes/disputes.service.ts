import { make, makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { BillingCustomersService } from "@/modules/billing-customers";
import { BillingProvider } from "@/modules/billing-provider";
import { PurchasesService } from "@/modules/purchases";

import type { DisputeEntity } from "./dispute.entity";
import { CLOSED_DISPUTE_STATUSES } from "./disputes.constants";
import { DisputesRepository } from "./ports";

export class DisputesService extends Service {
  private readonly provider = make(BillingProvider);

  private readonly disputes = makeRepository(DisputesRepository);

  private readonly billingCustomersService = makeService(
    BillingCustomersService,
  );

  private readonly purchasesService = makeService(PurchasesService);

  public async sync(
    providerDisputeId: string,
    providerCustomerId: string | null,
  ): Promise<DisputeEntity | null> {
    const customerId =
      providerCustomerId ??
      (await this.provider.findDispute(providerDisputeId))?.customerId ??
      null;

    return this.billingCustomersService.lockedFor(customerId, async () => {
      const customer =
        customerId === null
          ? null
          : await this.billingCustomersService.ensure(customerId);
      const dispute = await this.provider.findDispute(providerDisputeId);

      if (!dispute) return null;

      const row = await this.disputes.sync(
        {
          ...dispute,
          provider: this.provider.name,
          userId: customer?.userId ?? null,
          closed: CLOSED_DISPUTE_STATUSES.includes(dispute.status),
        },
        new Date(),
      );

      if (dispute.outcome === "lost" && dispute.invoiceId !== null) {
        await this.purchasesService.recordRefunds(dispute.invoiceId, {
          disputeLost: true,
        });
      }

      return row;
    });
  }
}
