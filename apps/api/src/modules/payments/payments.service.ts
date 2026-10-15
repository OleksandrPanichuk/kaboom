import { make, makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { BillingCustomersService } from "@/modules/billing-customers";
import { BillingProvider } from "@/modules/billing-provider";

import type { PaymentEntity } from "./payment.entity";
import { PaymentsRepository } from "./ports";

export class PaymentsService extends Service {
  private get provider() {
    return make(BillingProvider);
  }

  private readonly payments = makeRepository(PaymentsRepository);

  private readonly customers = makeService(BillingCustomersService);

  public sync(
    providerCustomerId: string,
    providerPaymentId: string,
  ): Promise<PaymentEntity | null> {
    return this.customers.locked(providerCustomerId, async () => {
      const customer = await this.customers.ensure(providerCustomerId);
      const payment = await this.provider.findPayment(providerPaymentId);

      if (!payment) return null;

      return this.payments.sync(
        {
          ...payment,
          provider: this.provider.name,
          userId: customer?.userId ?? null,
        },
        new Date(),
      );
    });
  }
}
