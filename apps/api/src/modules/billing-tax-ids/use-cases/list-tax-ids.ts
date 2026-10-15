import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { BillingTaxIdEntity } from "../billing-tax-id.entity";
import { BillingTaxIdsService } from "../billing-tax-ids.service";

export interface ListTaxIdsUseCaseOptions {
  userId: string;
}

type Options = ListTaxIdsUseCaseOptions;
type Result = BillingTaxIdEntity[];

export class ListTaxIdsUseCase extends UseCase<Options, Result> {
  private readonly billingTaxIdsService = makeService(BillingTaxIdsService);

  public execute({ userId }: Options): Promise<Result> {
    return this.billingTaxIdsService.list(userId);
  }
}
