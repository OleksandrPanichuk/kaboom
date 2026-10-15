import type { Page, PageRequest } from "@/core/pagination";
import { make, makeRepository } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { BillingProvider } from "@/modules/billing-provider";

import type { InvoiceEntity } from "../invoice.entity";
import { InvoicesRepository } from "../ports";

export interface ListInvoicesUseCaseOptions {
  userId: string;
  page: PageRequest;
}

type Options = ListInvoicesUseCaseOptions;
type Result = Page<InvoiceEntity>;

export class ListInvoicesUseCase extends UseCase<Options, Result> {
  private readonly provider = make(BillingProvider);

  private readonly invoices = makeRepository(InvoicesRepository);

  public execute({ userId, page }: Options): Promise<Result> {
    return this.invoices.listForUser(this.provider.name, userId, page);
  }
}
