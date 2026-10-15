import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import type { ProviderAddress } from "@/modules/billing-provider";
import { UsersService } from "@/modules/users";

import type { BillingCustomerEntity } from "../billing-customer.entity";
import { BillingCustomersService } from "../billing-customers.service";

export interface UpdateBillingDetailsUseCaseOptions {
  userId: string;
  name: string;
  address: ProviderAddress;
}

type Options = UpdateBillingDetailsUseCaseOptions;
type Result = BillingCustomerEntity;

export class UpdateBillingDetailsUseCase extends UseCase<Options, Result> {
  private readonly usersService = makeService(UsersService);

  private readonly billingCustomersService = makeService(
    BillingCustomersService,
  );

  public async execute({ userId, name, address }: Options): Promise<Result> {
    const user = await this.usersService.getById(userId);

    return this.billingCustomersService.updateDetails(user, { name, address });
  }
}
