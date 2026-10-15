import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { UsersService } from "@/modules/users";

import {
  CheckoutService,
  type SubscriptionCheckout,
} from "../checkout.service";

export interface SubscribeUseCaseOptions {
  userId: string;
  offer: string;
}

type Options = SubscribeUseCaseOptions;
type Result = SubscriptionCheckout;

export class SubscribeUseCase extends UseCase<Options, Result> {
  private readonly usersService = makeService(UsersService);

  private readonly checkoutService = makeService(CheckoutService);

  public async execute({ userId, offer }: Options): Promise<Result> {
    const user = await this.usersService.getById(userId);

    return this.checkoutService.subscribe(user, offer);
  }
}
