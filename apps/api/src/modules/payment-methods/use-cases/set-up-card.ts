import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { UsersService } from "@/modules/users";

import { PaymentMethodsService } from "../payment-methods.service";

export interface SetUpCardUseCaseOptions {
  userId: string;
}

type Options = SetUpCardUseCaseOptions;
type Result = string;

export class SetUpCardUseCase extends UseCase<Options, Result> {
  private readonly usersService = makeService(UsersService);

  private readonly paymentMethodsService = makeService(PaymentMethodsService);

  public async execute({ userId }: Options): Promise<Result> {
    return this.paymentMethodsService.setup(
      await this.usersService.getById(userId),
    );
  }
}
