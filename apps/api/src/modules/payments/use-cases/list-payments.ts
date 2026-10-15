import type { Page, PageRequest } from "@/core/pagination";
import { make, makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { BillingProvider } from "@/modules/billing-provider";

import type { PaymentEntity } from "../payment.entity";
import { PaymentsRepository } from "../ports";

export interface ListPaymentsUseCaseOptions {
  userId: string;
  page: PageRequest;
}

type Options = ListPaymentsUseCaseOptions;
type Result = Page<PaymentEntity>;

export class ListPaymentsUseCase extends UseCase<Options, Result> {
  private readonly provider = make(BillingProvider);

  private readonly payments = makeRepository(PaymentsRepository);

  public execute({ userId, page }: Options): Promise<Result> {
    return this.payments.listForUser(this.provider.name, userId, page);
  }
}
