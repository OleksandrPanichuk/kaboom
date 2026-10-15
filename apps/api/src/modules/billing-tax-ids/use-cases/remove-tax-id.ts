import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { BillingTaxIdsService } from "../billing-tax-ids.service";

export interface RemoveTaxIdUseCaseOptions {
  userId: string;
  taxIdId: string;
}

type Options = RemoveTaxIdUseCaseOptions;
type Result = void;

export class RemoveTaxIdUseCase extends UseCase<Options, Result> {
  private readonly billingTaxIdsService = makeService(BillingTaxIdsService);

  public execute({ userId, taxIdId }: Options): Promise<Result> {
    return this.billingTaxIdsService.remove(userId, taxIdId);
  }
}
