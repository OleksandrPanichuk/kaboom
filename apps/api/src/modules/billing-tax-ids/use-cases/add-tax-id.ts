import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { UsersService } from "@/modules/users";

import type { BillingTaxIdEntity } from "../billing-tax-id.entity";
import { BillingTaxIdsService } from "../billing-tax-ids.service";

export interface AddTaxIdUseCaseOptions {
  userId: string;
  type: string;
  value: string;
}

type Options = AddTaxIdUseCaseOptions;
type Result = BillingTaxIdEntity;

export class AddTaxIdUseCase extends UseCase<Options, Result> {
  private readonly usersService = makeService(UsersService);

  private readonly billingTaxIdsService = makeService(BillingTaxIdsService);

  public async execute({ userId, type, value }: Options): Promise<Result> {
    const user = await this.usersService.getById(userId);

    return this.billingTaxIdsService.add(user, { type, value });
  }
}
