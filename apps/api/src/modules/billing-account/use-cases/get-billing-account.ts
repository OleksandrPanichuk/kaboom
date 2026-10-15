import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { BillingAccountEntity } from "../billing-account.entity";
import { BillingAccountService } from "../billing-account.service";

export interface GetBillingAccountUseCaseOptions {
  userId: string;
}

type Options = GetBillingAccountUseCaseOptions;
type Result = BillingAccountEntity;

export class GetBillingAccountUseCase extends UseCase<Options, Result> {
  private readonly billingAccountService = makeService(BillingAccountService);

  public execute({ userId }: Options): Promise<Result> {
    return this.billingAccountService.accountOf(userId);
  }
}
