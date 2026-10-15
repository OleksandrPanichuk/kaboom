import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { UsersService } from "@/modules/users";

import { CheckoutService, type LifetimeCheckout } from "../checkout.service";

export interface BuyLifetimeUseCaseOptions {
  userId: string;
  offer: string;
}

type Options = BuyLifetimeUseCaseOptions;
type Result = LifetimeCheckout;

export class BuyLifetimeUseCase extends UseCase<Options, Result> {
  private readonly usersService = makeService(UsersService);

  private readonly checkoutService = makeService(CheckoutService);

  public async execute({ userId, offer }: Options): Promise<Result> {
    const user = await this.usersService.getById(userId);

    return this.checkoutService.buyLifetime(user, offer);
  }
}
