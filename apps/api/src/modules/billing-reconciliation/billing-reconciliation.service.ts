import { make, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { BillingEventInboxService } from "@/modules/billing-events";
import { BillingProvider } from "@/modules/billing-provider";

export interface BillingReconciliation {
  seen: number;
  missed: number;
  queued: number;
}

export class BillingReconciliationService extends Service {
  private readonly provider = make(BillingProvider);

  private readonly billingEventInboxService = makeService(
    BillingEventInboxService,
  );

  public async reconcile(since: Date): Promise<BillingReconciliation> {
    const result: BillingReconciliation = { seen: 0, missed: 0, queued: 0 };

    if (!this.provider.available) return result;

    for await (const event of this.provider.listEvents(since)) {
      const { duplicate, queued } =
        await this.billingEventInboxService.receive(event);

      result.seen += 1;
      if (!duplicate) result.missed += 1;
      if (queued) result.queued += 1;
    }

    return result;
  }
}
